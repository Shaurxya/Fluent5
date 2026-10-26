from collections import Counter
import re
from spacy.tokens import Doc
from .schemas import Chunk, Frequency, Suggestion, VocabularyResult


def analyze_vocabulary(text: str, doc: Doc) -> VocabularyResult:
    words = [t for t in doc if t.is_alpha]
    lemmas = [(t.lemma_ or t.lower_).lower() for t in words]
    content = [t for t in words if not t.is_stop]
    counts = Counter((t.lemma_ or t.lower_).lower() for t in content)
    chunks: list[Chunk] = []
    seen: set[str] = set()
    if doc.has_annotation("DEP"):
        candidates = list(doc.noun_chunks)
        candidates += [doc[t.i:t.i+2] for t in doc[:-1] if t.pos_ == "VERB" and doc[t.i+1].pos_ in ("ADP", "PART")]
    else:
        candidates = []  # No fake noun phrases when the trained pipeline is absent.
    for span in sorted(candidates, key=lambda s: -sum(not t.is_stop for t in s)):
        if 2 <= len(span) <= 6 and any(t.is_alpha and not t.is_stop for t in span) and span.text.lower() not in seen:
            chunks.append(Chunk(text=span.text, start=span.start_char, end=span.end_char, source="syntactic_phrase"))
            seen.add(span.text.lower())
        if len(chunks) >= 8:
            break
    # Context-attested reusable expressions. Nothing is invented from outside the passage.
    for match in re.finditer(r"\b(?:in (?:fact|addition|contrast)|as a result|on the other hand|for (?:example|instance)|according to|such as|rather than|more than|at least)\b", text, re.I):
        if match[0].lower() not in seen:
            chunks.append(Chunk(text=match[0], start=match.start(), end=match.end(), source="attested_expression"))
            seen.add(match[0].lower())
    suggestions = []
    contexts = [(r"\bgood\s+(story|acting|movie)\b", {"story": "engaging story", "acting": "impressive acting", "movie": "enjoyable movie"}),
                (r"\b(story|acting|movie)\s+is\s+good\b", {"story": "the story is engaging", "acting": "the acting is impressive", "movie": "the movie is enjoyable"})]
    if counts.get("good", 0) >= 2:
        for pattern, alternatives in contexts:
            for match in re.finditer(pattern, text, re.I):
                suggestions.append(Suggestion(original=match[0], suggestion=alternatives[match[1].lower()],
                    reason="An optional, more specific description in this context. 'Good' is valid English; choose only if this preserves your opinion."))
    window = 50
    mattr = (sum(len(set(lemmas[i:i+window])) / window for i in range(len(lemmas)-window+1)) / (len(lemmas)-window+1)
             if len(lemmas) >= window else None)
    return VocabularyResult(word_count=len(words), unique_lemmas=len(set(lemmas)), content_word_count=len(content),
        type_token_ratio=round(len(set(lemmas)) / max(1, len(lemmas)), 4), mattr=round(mattr, 4) if mattr is not None else None,
        repetitions=[Frequency(word=w, count=c) for w, c in counts.most_common(12) if c >= 3],
        keywords=[w for w, _ in counts.most_common(10)], chunks=chunks[:10], suggestions=suggestions[:8],
        mean_word_length=round(sum(len(t.text) for t in words)/max(1, len(words)), 2),
        long_word_fraction=round(sum(len(t.text) >= 8 for t in words)/max(1, len(words)), 4),
        note="TTR is highly sensitive to response length. MATTR uses a 50-word window and is unavailable for shorter responses. Compare similar tasks and lengths; longer words are not inherently better.")
