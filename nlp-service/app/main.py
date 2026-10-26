import asyncio
import hmac
import logging
import time
from contextlib import asynccontextmanager
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from .core import settings
from .engine import analyze
from .pipeline import pipeline
from .schemas import AnalyzeRequest, AnalysisResponse

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s %(message)s")
log = logging.getLogger("fluentfive.nlp")
bearer = HTTPBearer(auto_error=False)
slots = asyncio.Semaphore(settings().max_concurrent)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    pipeline()  # Load the small shared pipeline once. Embeddings are lazy and local-only.
    yield


app = FastAPI(title="FluentFive Private NLP", version="1.0.0", lifespan=lifespan,
              docs_url=None, redoc_url=None, openapi_url=None)


async def authorize(credentials: HTTPAuthorizationCredentials | None = Depends(bearer)):
    key = settings().api_key
    if not key:
        raise HTTPException(503, "NLP service authentication is not configured.")
    if not credentials or not hmac.compare_digest(credentials.credentials, key):
        raise HTTPException(401, "Unauthorized")


@app.middleware("http")
async def guard(request: Request, call_next):
    # Also bound streamed bodies: Content-Length alone is client-controlled.
    if request.method == "POST":
        body = bytearray()
        async for chunk in request.stream():
            body.extend(chunk)
            if len(body) > 100000:
                return JSONResponse({"error": {"code": "too_large", "message": "Request exceeds 100KB."}}, status_code=413)
        request._body = bytes(body)
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response


@app.exception_handler(RequestValidationError)
async def validation_error(_request, _error):
    # Pydantic error details can include the raw transcript; deliberately do not return them.
    return JSONResponse({"error": {"code": "invalid_input", "message": "Invalid or oversized analysis input."}}, status_code=422)


@app.exception_handler(HTTPException)
async def http_error(_request, error):
    return JSONResponse({"error": {"code": str(error.status_code), "message": error.detail}}, status_code=error.status_code)


@app.exception_handler(Exception)
async def service_error(_request, _error):
    log.error("analysis_failed")
    return JSONResponse({"error": {"code": "internal", "message": "Analysis could not be completed."}}, status_code=500)


@app.get("/health")
async def health():
    return {"status": "ok", "version": "nlp-v1"}


@app.get("/capabilities", dependencies=[Depends(authorize)])
async def capabilities():
    return {"trained_spacy": pipeline().has_pipe("tagger"), "embeddings_enabled": settings().embeddings_enabled,
            "languagetool_configured": bool(settings().languagetool_url), "acoustic_assessment": False}


@app.get("/openapi.json", dependencies=[Depends(authorize)])
async def schema():
    return app.openapi()


@app.post("/nlp/analyze", response_model=AnalysisResponse, dependencies=[Depends(authorize)])
async def analyze_endpoint(request: AnalyzeRequest):
    start = time.perf_counter()
    try:
        await asyncio.wait_for(slots.acquire(), timeout=2)
    except TimeoutError:
        raise HTTPException(429, "Analysis capacity is busy; retry shortly.") from None
    try:
        result = await asyncio.wait_for(analyze(request), timeout=40)
        log.info("analysis_complete mode=%s latency_ms=%.1f", request.mode, (time.perf_counter()-start)*1000)
        return result
    except ValueError as error:
        raise HTTPException(422, str(error)) from None
    except TimeoutError:
        raise HTTPException(504, "Analysis timed out; retry with a shorter response.") from None
    finally:
        slots.release()
