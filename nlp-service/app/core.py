"""Private service configuration. Never download models during a learner request."""
import os
from pathlib import Path
from dataclasses import dataclass
from functools import lru_cache


@dataclass(frozen=True)
class Settings:
    api_key: str = os.getenv("NLP_SERVICE_API_KEY", "")
    spacy_model: str = os.getenv("SPACY_MODEL", "en_core_web_sm")
    embedding_model: str = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
    embedding_revision: str = os.getenv("EMBEDDING_REVISION", "c9745ed1d9f207416be6d2e6f8de32d1f16199bf")
    embeddings_enabled: bool = os.getenv("NLP_ENABLE_EMBEDDINGS", "false").lower() == "true"
    model_cache: str = os.getenv("NLP_MODEL_CACHE", str(Path(__file__).resolve().parents[1] / ".model-cache" / "hub"))
    languagetool_url: str = os.getenv("LANGUAGETOOL_URL", "")
    external_timeout: float = 8.0
    max_concurrent: int = 4


@lru_cache(maxsize=1)
def settings() -> Settings:
    return Settings()
