import re
import numpy as np
from spacy.tokens import Doc
from .pipeline import embed
from .schemas import AnalyzeRequest, SemanticResult, TargetMatch


def contains_phrase(text: str, phrase: str) -> bool:
    words = re.findall(r"\w+", phrase.casefold())
    return bool(words) and re.search(r"(?<!\w)" + r"\W+".join(map(re.escape, words)) + r"(?!\w)", text.casefold()) is not None


def analyze_semantics(request: AnalyzeRequest, doc: Doc, keywords: list[str]) -> SemanticResult:
    sentences = [s.text for s in doc.sents][:30]
    target = request.expected_answer or request.prompt
    matches = [TargetMatch(target=t, matched=contains_phrase(request.text, t), method="lexical") for t in request.targets]
    # Exact duplicate detection remains useful without embeddings.
    duplicates = [[i, j] for i in range(len(sentences)) for j in range(i+1, len(sentences))
                  if sentences[i].strip().casefold() == sentences[j].strip().casefold()]
    all_texts = ([target] if target else []) + [request.text] + sentences + request.targets
    vectors = embed(all_texts) if target or len(sentences) > 1 or request.targets else None
    similarity = coherence = coverage = None
    relevance = "not_assessed"
    if target:
        target_words = {w.casefold() for w in re.findall(r"\b\w{4,}\b", target)}
        coverage = round(len(target_words & set(keywords))/max(1, len(target_words)), 4)
    if vectors is not None:
        offset = int(bool(target))
        if target:
            similarity = round(float(np.dot(vectors[0], vectors[1])), 4)
            relevance = "likely_related" if similarity >= 0.35 else "possibly_off_topic" if similarity < 0.15 else "uncertain"
        sentence_vectors = vectors[offset+1:offset+1+len(sentences)]
        if len(sentences) > 1:
            coherence = round(float(np.mean([np.dot(a, b) for a, b in zip(sentence_vectors, sentence_vectors[1:])])), 4)
            for i in range(len(sentences)):
                for j in range(i+1, len(sentences)):
                    if float(np.dot(sentence_vectors[i], sentence_vectors[j])) >= 0.92 and [i, j] not in duplicates:
                        duplicates.append([i, j])
        # Semantic matches are hints, never counted as exact use of a target phrase.
        for match, vector in zip(matches, vectors[offset+1+len(sentences):]):
            if not match.matched and sentence_vectors:
                match.similarity = round(max(float(np.dot(vector, s)) for s in sentence_vectors), 4)
                match.method = "semantic_hint"
    return SemanticResult(status="available" if vectors is not None else "unavailable" if target else "not_requested",
        method="sentence-transformer cosine" if vectors is not None else "lexical coverage only",
        similarity=similarity, relevance=relevance, keyword_coverage=coverage, coherence=coherence,
        matches=matches, duplicate_sentences=duplicates,
        note="Similarity is evidence of topic relationship, not correctness. Thresholds are provisional. Coherence is adjacent-sentence similarity, not a logical-validity score. Keyword overlap alone cannot judge relevance."
             + (" Embeddings unavailable; semantic relevance is not scored." if vectors is None else " Texts beyond the model token limit are truncated."))
