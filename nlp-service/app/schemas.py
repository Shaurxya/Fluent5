from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class AnalyzeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=False)
    mode: Literal["grammar", "vocabulary", "semantics", "speak", "write", "read", "shadow", "cycle"] = "cycle"
    text: str = Field(min_length=1, max_length=12000)
    prompt: str = Field(default="", max_length=2000)
    reference: str = Field(default="", max_length=12000)
    expected_answer: str = Field(default="", max_length=2000)
    targets: list[str] = Field(default_factory=list, max_length=30)
    duration_seconds: float | None = Field(default=None, gt=0, le=1800)
    target_register: Literal["neutral", "formal", "informal"] = "neutral"

    @field_validator("text")
    @classmethod
    def not_blank(cls, value: str) -> str:
        if not value.strip() or not any(c.isalpha() for c in value):
            raise ValueError("Provide text containing at least one word.")
        return value

    @field_validator("targets")
    @classmethod
    def bounded_targets(cls, values: list[str]) -> list[str]:
        if any(not v.strip() or len(v) > 180 for v in values):
            raise ValueError("Each target must contain 1–180 characters.")
        return list(dict.fromkeys(values))

    @model_validator(mode="after")
    def reference_required(self) -> "AnalyzeRequest":
        if self.mode == "shadow" and not any(c.isalpha() for c in self.reference):
            raise ValueError("Shadowing requires reference words.")
        return self


class Token(BaseModel):
    text: str
    start: int
    end: int
    lemma: str
    pos: str | None


class Span(BaseModel):
    text: str
    start: int
    end: int


class Entity(Span):
    label: str


class Preprocessing(BaseModel):
    tokens: list[Token]
    sentences: list[Span]
    entities: list[Entity]
    model: str
    trained_pipeline: bool


class GrammarError(BaseModel):
    id: str
    start: int
    end: int
    original: str
    category: str
    replacements: list[str]
    explanation: str
    source: str


class GrammarResult(BaseModel):
    status: Literal["available", "partial"]
    corrected_text: str
    errors: list[GrammarError]
    recommendations: list[str]
    note: str
    detector_version: str = "learner-rules-v1"


class Frequency(BaseModel):
    word: str
    count: int


class Chunk(Span):
    source: str


class Suggestion(BaseModel):
    original: str
    suggestion: str
    reason: str


class VocabularyResult(BaseModel):
    word_count: int
    unique_lemmas: int
    content_word_count: int
    type_token_ratio: float
    mattr: float | None
    repetitions: list[Frequency]
    keywords: list[str]
    chunks: list[Chunk]
    suggestions: list[Suggestion]
    mean_word_length: float
    long_word_fraction: float
    note: str


class TargetMatch(BaseModel):
    target: str
    matched: bool
    method: str
    similarity: float | None = None


class SemanticResult(BaseModel):
    status: Literal["available", "unavailable", "not_requested"]
    method: str
    similarity: float | None
    relevance: Literal["likely_related", "uncertain", "possibly_off_topic", "not_assessed"]
    keyword_coverage: float | None
    coherence: float | None
    matches: list[TargetMatch]
    duplicate_sentences: list[list[int]]
    note: str


class ScoreComponent(BaseModel):
    key: str
    value: float
    weight: float


class PracticeScore(BaseModel):
    value: int
    label: str = "FluentFive practice score — not a certified proficiency assessment"
    version: str = "practice-v1"
    components: list[ScoreComponent]


class FluencyResult(BaseModel):
    duration_seconds: float | None
    words_per_minute: float | None
    filler_count: int
    fillers: list[Frequency]
    repetitions: list[str]
    self_correction_markers: int
    complete_sentence_fraction: float | None
    grammar_errors_per_100_words: float
    pause_seconds: None = None
    pronunciation_score: None = None
    score: PracticeScore | None
    note: str


class AlignmentWord(BaseModel):
    reference: str | None
    recognized: str | None
    operation: Literal["equal", "substitution", "deletion", "insertion"]


class ShadowResult(BaseModel):
    alignment: list[AlignmentWord]
    substitutions: int
    deletions: int
    insertions: int
    wer: float
    lexical_accuracy: float
    completion: float
    practice_phrases: list[str]
    note: str


class ComprehensionQuestion(BaseModel):
    id: str
    question: str
    expected_answer: str


class ReadingResult(BaseModel):
    questions: list[ComprehensionQuestion]
    reading_ease: float
    difficulty: str
    note: str


class WritingResult(BaseModel):
    paragraph_count: int
    mean_sentence_words: float
    suggestions: list[str]
    detected_register: str
    register_note: str


class ModelInfo(BaseModel):
    spacy_version: str
    spacy_pipeline_version: str
    embedding_model: str
    embedding_revision: str
    embeddings_used: bool


class AnalysisResponse(BaseModel):
    version: str = "nlp-v1"
    request_id: str
    mode: str
    text: str
    offset_encoding: Literal["unicode_codepoints"] = "unicode_codepoints"
    model_info: ModelInfo
    preprocessing: Preprocessing
    grammar: GrammarResult
    vocabulary: VocabularyResult
    semantics: SemanticResult
    fluency: FluencyResult
    shadowing: ShadowResult | None
    reading: ReadingResult | None
    writing: WritingResult | None
    warnings: list[str]
    latency_ms: float
