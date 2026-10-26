FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 HF_HOME=/models NLP_MODEL_CACHE=/models/hub
WORKDIR /service
COPY requirements.txt requirements-semantic.txt constraints.txt ./
ARG WITH_EMBEDDINGS=false
RUN pip install --no-cache-dir -c constraints.txt -r requirements.txt && pip install --no-cache-dir https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.8.0/en_core_web_sm-3.8.0-py3-none-any.whl
RUN if [ "$WITH_EMBEDDINGS" = "true" ]; then pip install --no-cache-dir torch==2.8.0 --index-url https://download.pytorch.org/whl/cpu && pip install --no-cache-dir -c constraints.txt -r requirements-semantic.txt; fi
COPY app ./app
COPY scripts ./scripts
RUN if [ "$WITH_EMBEDDINGS" = "true" ]; then python scripts/download_models.py; fi
RUN useradd --uid 10001 --create-home nlp && mkdir -p /models && chown -R nlp:nlp /models /service
USER nlp
EXPOSE 8000
HEALTHCHECK CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health',timeout=2)"
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--no-access-log"]
