from collections import Counter
import re
from spacy.tokens import Doc
from .schemas import AnalyzeRequest, GrammarResult, VocabularyResult, FluencyResult, Frequency, PracticeScore, ScoreComponent


def analyze_fluency(request: AnalyzeRequest, doc: Doc, grammar: GrammarResult, vocabulary: VocabularyResult) -> FluencyResult:
    text = request.text
    # Longest alternatives first to avoid double-counting overlapping markers.
    matches = re.findall(r"\b(?:you know|i mean|sort of|kind of|um+|uh+|erm?|basically|actually|like)\b", text, re.I)
    counts = Counter(m.casefold() for m in matches)
    word_count = vocabulary.word_count
    wpm = round(word_count * 60 / request.duration_seconds, 1) if request.duration_seconds else None
    repetitions = re.findall(r"\b(\w+)\s+\1\b", text, re.I)
    completeness = None
    if doc.has_annotation("POS"):
        sentences = list(doc.sents)
        completeness = round(sum(any(t.pos_ in ("VERB", "AUX") for t in s) and
            any(t.dep_ in ("nsubj", "nsubjpass", "csubj") or t.tag_ == "VB" for t in s) for s in sentences) / max(1, len(sentences)), 4)
    rate = len(grammar.errors) * 100 / max(1, word_count)
    score = None
    if request.mode in ("cycle", "speak", "write") and word_count >= 10:
        # Never include unmeasured semantics, acoustic cues, or short-sample TTR in a score.
        components = [ScoreComponent(key="detected_grammar", value=max(0, 100-rate*8), weight=0.6)]
        if request.mode != "write":
            components.append(ScoreComponent(key="filler_control", value=max(0, 100-len(matches)/max(1, word_count)*250), weight=0.3))
            if wpm is not None:
                pace = max(0, 100-max(0, 80-wpm)*1.2-max(0, wpm-180)*0.7)
                components.append(ScoreComponent(key="session_pace", value=pace, weight=0.1))
        total = sum(c.weight for c in components)
        components = [c.model_copy(update={"weight": round(c.weight/total, 4), "value": round(c.value, 1)}) for c in components]
        score = PracticeScore(value=round(sum(c.value*c.weight for c in components)), components=components)
    return FluencyResult(duration_seconds=request.duration_seconds, words_per_minute=wpm,
        filler_count=len(matches), fillers=[Frequency(word=w, count=c) for w, c in counts.most_common()],
        repetitions=list(dict.fromkeys(repetitions)), self_correction_markers=len(re.findall(r"\b(?:i mean|sorry|rather|let me rephrase)\b", text, re.I)),
        complete_sentence_fraction=completeness, grammar_errors_per_100_words=round(rate, 2), score=score,
        note="WPM uses recognized words divided by elapsed session time, including silence; it is not articulation rate. 'Like', 'actually' and similar markers may be meaningful rather than fillers. Self-corrections and completeness are heuristics. No acoustic pronunciation or pause measurements. Grammar component depends on detector coverage; scores across detector configurations are not comparable. Scores require at least 10 words.")
