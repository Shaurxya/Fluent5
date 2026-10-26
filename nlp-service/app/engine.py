import asyncio
import time
import uuid
import spacy
from .core import settings
from .pipeline import preprocess, pipeline
from .grammar import analyze_grammar
from .vocabulary import analyze_vocabulary
from .semantics import analyze_semantics
from .fluency import analyze_fluency
from .shadowing import align
from .reading import analyze_reading, analyze_writing
from .schemas import AnalyzeRequest, AnalysisResponse, ModelInfo


async def analyze(request: AnalyzeRequest) -> AnalysisResponse:
    start = time.perf_counter()
    doc, preprocessing = await asyncio.to_thread(preprocess, request.text)
    grammar = await analyze_grammar(request.text, doc)
    vocabulary = analyze_vocabulary(request.text, doc)
    semantics = await asyncio.to_thread(analyze_semantics, request, doc, vocabulary.keywords)
    fluency = analyze_fluency(request, doc, grammar, vocabulary)
    warnings = []
    if not preprocessing.trained_pipeline:
        warnings.append("Trained spaCy pipeline unavailable: POS, trained lemmatization, NER and dependency phrase extraction are unavailable.")
    if grammar.status == "partial":
        warnings.append("Grammar uses limited local rules; configure LanguageTool for wider coverage.")
    if semantics.status == "unavailable":
        warnings.append("Semantic model unavailable. Relevance and semantic coherence are not measured.")
    shadowing = align(request.reference, request.text) if request.mode == "shadow" else None
    return AnalysisResponse(request_id=str(uuid.uuid4()), mode=request.mode, text=request.text,
        model_info=ModelInfo(spacy_version=spacy.__version__, spacy_pipeline_version=pipeline().meta.get("version", "unknown"),
            embedding_model=settings().embedding_model, embedding_revision=settings().embedding_revision,
            embeddings_used=semantics.status == "available"),
        preprocessing=preprocessing, grammar=grammar, vocabulary=vocabulary, semantics=semantics,
        fluency=fluency, shadowing=shadowing, reading=analyze_reading(doc) if request.mode == "read" else None,
        writing=analyze_writing(request.text, doc, request.target_register) if request.mode == "write" else None,
        warnings=warnings, latency_ms=round((time.perf_counter()-start)*1000, 2))
