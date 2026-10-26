"""Conservative learner rules plus optional LanguageTool. Offsets are code points."""
import re
import httpx
from spacy.tokens import Doc
from .core import settings
from .schemas import GrammarError, GrammarResult

PAST = {"go": "went", "goes": "went", "meet": "met", "meets": "met",
        "eat": "ate", "eats": "ate", "see": "saw", "sees": "saw",
        "buy": "bought", "buys": "bought", "visit": "visited", "visits": "visited"}


def apply_corrections(text: str, errors: list[GrammarError]) -> str:
    """Apply disjoint spans right-to-left, preserving every other character."""
    end = len(text) + 1
    for error in sorted(errors, key=lambda e: e.start, reverse=True):
        if error.end <= end and error.replacements:
            text = text[:error.start] + error.replacements[0] + text[error.end:]
            end = error.start
    return text


def local_errors(text: str, doc: Doc) -> list[GrammarError]:
    errors: list[GrammarError] = []

    def add(start: int, end: int, replacement: str, category: str, explanation: str):
        if any(start < e.end and end > e.start for e in errors):
            return
        original = text[start:end]
        if original[:1].isupper():
            replacement = replacement[:1].upper() + replacement[1:]
        errors.append(GrammarError(id=f"local-{start}-{end}", start=start, end=end,
            original=original, category=category, replacements=[replacement],
            explanation=explanation, source="learner-rules-v1"))

    for sentence in doc.sents:
        # Temporal cue + explicit finite subject, or a coordinated verb in the same clause.
        # Deliberately narrow: do not infer tense from POS alone or change quoted/hypothetical text.
        past_cue = re.search(r"\b(yesterday|last (?:night|week|month|year))\b", sentence.text, re.I)
        if past_cue and not re.search(r"\b(would|could|should|will|if|did|does|has|have|had)\b|[\"“”]", sentence.text, re.I):
            finite_found = False
            for match in re.finditer(r"\b((?:I|we|they|he|she|you)\s+|and\s+)(go|goes|meet|meets|eat|eats|see|sees|buy|buys|visit|visits)\b", sentence.text, re.I):
                if match.group(1).strip().lower() == "and" and not finite_found:
                    continue
                finite_found = True
                word = match.group(2).lower()
                add(sentence.start_char + match.start(2), sentence.start_char + match.end(2),
                    PAST[word], "tense", "The explicit past-time expression calls for the simple past in this clause.")

    rules = [
        (r"\b(I|you|we|they)\s+(goes|likes|wants|needs|works|plays)\b", 2,
         lambda m: "go" if m[2].lower() == "goes" else m[2][:-1], "subject_verb_agreement", "Use the base present-tense verb with this subject."),
        (r"\b(he|she|it)\s+(go|like|want|need|work|play)\b", 2,
         lambda m: m[2] + ("es" if m[2].lower() == "go" else "s"), "subject_verb_agreement", "Add -s or -es with a third-person singular subject in the present tense."),
        (r"\b(I)\s+(is|are)\b", 2, lambda m: "am", "subject_verb_agreement", "Use 'am' with 'I' in the present tense."),
        (r"\b(we|they|you)\s+(is)\b", 2, lambda m: "are", "subject_verb_agreement", "Use 'are' with this subject."),
        (r"\b(a)\s+(apple|orange|umbrella|hour|honest)\b", 1, lambda m: "an", "article", "Use 'an' before this vowel sound."),
        (r"\b(an)\s+(book|car|university|user)\b", 1, lambda m: "a", "article", "Use 'a' before this consonant sound."),
        (r"\b(depend)\s+(of)\b", 2, lambda m: "on", "preposition", "The usual collocation is 'depend on'."),
        (r"\b(interested)\s+(on)\b", 2, lambda m: "in", "preposition", "Use 'interested in' for the object of your interest."),
        (r"\b(very)\s+(beautifull)\b", 2, lambda m: "beautiful", "spelling", "The standard spelling is 'beautiful'."),
        (r"\b(very)\s+(quick)\s+(?:finished|completed)\b", 2, lambda m: "quickly", "word_form", "An adverb describes how the action was performed."),
    ]
    for pattern, group, replacement, category, explanation in rules:
        for match in re.finditer(pattern, text, re.I):
            prefix = text[:match.start()]
            if prefix.count('"') % 2 or prefix.count("“") > prefix.count("”"):
                continue
            if category == "subject_verb_agreement" and re.search(r"\b(suggest(?:ed|s)?|recommend(?:ed|s)?|insist(?:ed|s)?|demand(?:ed|s)?|wish(?:ed|es)?|lest)\b", text, re.I):
                continue  # Mandative/subjunctive clauses can legitimately use the base form.
            # Avoid diagnosing subjects embedded inside another clause, such as 'the book I like'.
            if category == "subject_verb_agreement" and re.search(r"\b(if|wish|would|could|should|to)\s*$", text[max(0, match.start()-15):match.start()], re.I):
                continue
            add(match.start(group), match.end(group), replacement(match), category, explanation)
    return errors


def category_for(rule_id: str, category: str) -> str:
    key = f"{rule_id} {category}".upper()
    for parts, label in [(("AGREEMENT", "HE_VERB", "I_VERB"), "subject_verb_agreement"),
                         (("TENSE", "PAST"), "tense"), (("ARTICLE", "DETERMINER", "A_AN"), "article"),
                         (("PREPOSITION",), "preposition"), (("SPELL", "MORFOLOGIK", "TYPOS"), "spelling"),
                         (("WORD_FORM", "ADVERB"), "word_form"), (("PUNCT",), "punctuation")]:
        if any(part in key for part in parts):
            return label
    return "grammar"


def utf16_to_codepoint(text: str, offset: int) -> int:
    return len(text.encode("utf-16-le")[:offset * 2].decode("utf-16-le", errors="ignore"))


async def analyze_grammar(text: str, doc: Doc) -> GrammarResult:
    errors = local_errors(text, doc)
    full = False
    detector_version = "learner-rules-v1"
    if settings().languagetool_url:
        try:
            async with httpx.AsyncClient(timeout=settings().external_timeout) as client:
                response = await client.post(settings().languagetool_url.rstrip("/") + "/v2/check",
                    data={"text": text, "language": "en-US"})
                response.raise_for_status()
                payload = response.json()
                matches = payload["matches"]
                detector_version += "+LanguageTool:" + str(payload.get("software", {}).get("version", "unknown"))
            for match in matches:
                start = utf16_to_codepoint(text, int(match["offset"]))
                end = utf16_to_codepoint(text, int(match["offset"]) + int(match["length"]))
                if not (0 <= start <= end <= len(text)) or any(start < e.end and end > e.start for e in errors):
                    continue
                rule = match.get("rule", {})
                errors.append(GrammarError(id=f"lt-{start}-{end}", start=start, end=end,
                    original=text[start:end], category=category_for(rule.get("id", ""), rule.get("category", {}).get("id", "")),
                    replacements=[r["value"] for r in match.get("replacements", [])[:3]],
                    explanation=match.get("message", "Check this expression."), source="LanguageTool"))
            full = True
        except (httpx.HTTPError, KeyError, ValueError, TypeError):
            pass  # Explicit partial status below; never log private text or provider payloads.
    errors.sort(key=lambda e: e.start)
    return GrammarResult(status="available" if full else "partial", corrected_text=apply_corrections(text, errors),
        errors=errors, recommendations=list(dict.fromkeys(e.explanation for e in errors))[:4],
        detector_version=detector_version,
        note="Detected issues are suggestions; absence of flags does not establish grammatical correctness."
             + (" LanguageTool is unavailable or unconfigured; conservative local rules only." if not full else ""))
