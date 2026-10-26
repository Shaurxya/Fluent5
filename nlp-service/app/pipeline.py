"""Shared CPU models; bounded caches retain hashes/vectors, never transcript strings."""
import hashlib
import logging
from collections import OrderedDict
from threading import Lock
import spacy
import numpy as np
from spacy.language import Language
from spacy.tokens import Doc
from .core import settings
from .schemas import Entity, Preprocessing, Span, Token

log = logging.getLogger("fluentfive.nlp")
_nlp: Language | None = None
_embedder = None
_embedding_failed = False
_lock = Lock()
_vectors: OrderedDict[str, np.ndarray] = OrderedDict()


def pipeline() -> Language:
    global _nlp
    with _lock:
        if _nlp is None:
            try:
                _nlp = spacy.load(settings().spacy_model)
            except (OSError, ImportError):
                log.warning("spacy_model_unavailable")
                _nlp = spacy.blank("en")
                _nlp.add_pipe("sentencizer")
            _nlp.max_length = 13000
    return _nlp


def preprocess(text: str) -> tuple[Doc, Preprocessing]:
    doc = pipeline()(text)
    trained = pipeline().has_pipe("tagger")
    result = Preprocessing(
        tokens=[Token(text=t.text, start=t.idx, end=t.idx + len(t.text),
                      lemma=(t.lemma_ or t.lower_), pos=t.pos_ or None)
                for t in doc if not t.is_space],
        sentences=[Span(text=s.text, start=s.start_char, end=s.end_char) for s in doc.sents],
        entities=[Entity(text=e.text, start=e.start_char, end=e.end_char, label=e.label_) for e in doc.ents],
        model=settings().spacy_model if trained else "spacy.blank(en)",
        trained_pipeline=trained,
    )
    return doc, result


def embed(texts: list[str]) -> list[np.ndarray] | None:
    """Return unit sentence embeddings, or None on unavailable optional model."""
    global _embedder, _embedding_failed
    if not settings().embeddings_enabled or _embedding_failed:
        return None
    with _lock:
        if _embedder is None:
            try:
                from sentence_transformers import SentenceTransformer
                _embedder = SentenceTransformer(settings().embedding_model,
                    revision=settings().embedding_revision, cache_folder=settings().model_cache, local_files_only=True, device="cpu")
                _embedder.max_seq_length = 256
            except Exception:
                _embedding_failed = True
                log.warning("embedding_model_unavailable")
                return None
        vectors = []
        for text in texts:
            key = hashlib.sha256(text.encode()).hexdigest()
            if key not in _vectors:
                try:
                    _vectors[key] = _embedder.encode(text, normalize_embeddings=True, show_progress_bar=False)
                except Exception:
                    log.warning("embedding_inference_failed")
                    return None
            _vectors.move_to_end(key)
            vectors.append(_vectors[key])
            while len(_vectors) > 256:
                _vectors.popitem(last=False)
        return vectors
