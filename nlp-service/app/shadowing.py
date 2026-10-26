import re
import unicodedata
from .schemas import AlignmentWord, ShadowResult


def align(reference: str, recognized: str) -> ShadowResult:
    """Levenshtein dynamic-programming alignment; WER may exceed 1 with insertions."""
    ref = re.findall(r"\b[^\W_]+(?:['’][^\W_]+)*\b", unicodedata.normalize("NFC", reference.casefold()).replace("’", "'"))
    hyp = re.findall(r"\b[^\W_]+(?:['’][^\W_]+)*\b", unicodedata.normalize("NFC", recognized.casefold()).replace("’", "'"))
    # Bounded before allocating O(n*m) memory.
    if len(ref) > 500 or len(hyp) > 500:
        raise ValueError("Shadowing is limited to 500 words per text.")
    if not ref:
        raise ValueError("Shadowing requires a reference containing words.")
    dp = [[0] * (len(hyp)+1) for _ in range(len(ref)+1)]
    for i in range(len(ref)+1):
        dp[i][0] = i
    for j in range(len(hyp)+1):
        dp[0][j] = j
    for i, a in enumerate(ref, 1):
        for j, b in enumerate(hyp, 1):
            dp[i][j] = min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+int(a != b))
    i, j = len(ref), len(hyp)
    result = []
    while i or j:
        if i and j and dp[i][j] == dp[i-1][j-1] + int(ref[i-1] != hyp[j-1]):
            result.append(AlignmentWord(reference=ref[i-1], recognized=hyp[j-1], operation="equal" if ref[i-1] == hyp[j-1] else "substitution"))
            i, j = i-1, j-1
        elif i and dp[i][j] == dp[i-1][j]+1:
            result.append(AlignmentWord(reference=ref[i-1], recognized=None, operation="deletion"))
            i -= 1
        else:
            result.append(AlignmentWord(reference=None, recognized=hyp[j-1], operation="insertion"))
            j -= 1
    result.reverse()
    sub = sum(w.operation == "substitution" for w in result)
    deleted = sum(w.operation == "deletion" for w in result)
    inserted = sum(w.operation == "insertion" for w in result)
    wer = (sub + deleted + inserted)/len(ref)
    return ShadowResult(alignment=result, substitutions=sub, deletions=deleted, insertions=inserted,
        wer=round(wer, 4), lexical_accuracy=round(max(0, 1-wer)*100, 1), completion=round((len(ref)-deleted)/len(ref)*100, 1),
        practice_phrases=list(dict.fromkeys(w.reference for w in result if w.reference and w.operation != "equal"))[:10],
        note="Word recognition agreement only. WER includes speech recognizer errors; it is not pronunciation accuracy. Phonemes, stress, rhythm and acoustic pauses are not assessed.")
