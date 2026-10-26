import re
from spacy.tokens import Doc
from .schemas import ComprehensionQuestion, ReadingResult, WritingResult


def syllables(word: str) -> int:
    word = word.lower()
    count = len(re.findall(r"[aeiouy]+", word))
    return max(1, count - int(word.endswith("e") and count > 1))


def analyze_reading(doc: Doc) -> ReadingResult:
    words = [t.text for t in doc if t.is_alpha]
    sentences = list(doc.sents)
    ease = 206.835 - 1.015 * len(words)/max(1, len(sentences)) - 84.6 * sum(syllables(w) for w in words)/max(1, len(words))
    questions = []
    if sentences:
        questions.append(ComprehensionQuestion(id="main-idea", question="What is this passage mainly about? Answer in your own words.", expected_answer=sentences[0].text))
    if len(sentences) >= 2:
        questions.append(ComprehensionQuestion(id="detail", question="Explain one supporting detail from the passage in your own words.", expected_answer=" ".join(s.text for s in sentences[1:4])))
    # Only ask a causal question when a causal relation is actually present.
    cause = next((s for s in sentences if re.search(r"\b(because|therefore|as a result)\b", s.text, re.I)), None)
    if cause is not None:
        questions.append(ComprehensionQuestion(id="cause", question="What cause-and-effect relationship does the passage describe?", expected_answer=cause.text))
    return ReadingResult(questions=questions, reading_ease=round(ease, 1),
        difficulty="more accessible" if ease >= 70 else "moderate" if ease >= 45 else "more demanding",
        note="Flesch-style reading ease uses heuristic syllables. It is a text difficulty estimate, not learner proficiency. Extractive answer anchors are not exhaustive; semantic similarity cannot prove correctness.")


def analyze_writing(text: str, doc: Doc, target_register: str) -> WritingResult:
    sentences = list(doc.sents)
    lengths = [sum(t.is_alpha for t in s) for s in sentences]
    suggestions = []
    for i, length in enumerate(lengths):
        if length > 30:
            suggestions.append(f"Sentence {i+1} has {length} words. Consider splitting it if it contains distinct ideas.")
    informal = bool(re.search(r"\b(gonna|wanna|lol|kinda|dude)\b", text, re.I))
    detected = "informal markers present" if informal else "no strong informal markers"
    if informal and target_register == "formal":
        suggestions.append("Your target is formal writing; consider replacing slang while keeping your meaning.")
    return WritingResult(paragraph_count=len([p for p in re.split(r"\n\s*\n", text) if p.strip()]),
        mean_sentence_words=round(sum(lengths)/max(1, len(lengths)), 1), suggestions=suggestions,
        detected_register=detected, register_note="Register detection is a small lexical heuristic, not a complete tone assessment.")
