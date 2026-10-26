import asyncio
from dataclasses import replace
import pytest
from fastapi.testclient import TestClient
from app.core import settings
from app.engine import analyze
from app.grammar import apply_corrections, local_errors, utf16_to_codepoint
from app.pipeline import preprocess
from app.schemas import AnalyzeRequest
from app.shadowing import align
from app.semantics import contains_phrase
from app.main import app


def run(text, **kwargs):
    return asyncio.run(analyze(AnalyzeRequest(text=text, **kwargs)))


def test_real_pipeline_tokenization_lemmas_pos_ner():
    doc, data = preprocess("Alice visited London yesterday. Her friends were running.")
    assert len(data.sentences) == 2
    assert data.trained_pipeline, "Install en_core_web_sm to verify trained linguistic features."
    assert any(t.text == "friends" and t.lemma == "friend" and t.pos == "NOUN" for t in data.tokens)
    assert any(e.text == "London" and e.label == "GPE" for e in data.entities)
    assert all(data_sentence.text == doc.text[data_sentence.start:data_sentence.end] for data_sentence in data.sentences)


@pytest.mark.parametrize("text,expected", [
    ("I goes to college yesterday and meet my friends.", "I went to college yesterday and met my friends."),
    ("I goes to college every day.", "I go to college every day."),
    ("She go home.", "She goes home."),
    ("I ate a apple.", "I ate an apple."),
    ("I am interested on music.", "I am interested in music."),
    ("I bought an book.", "I bought a book."),
])
def test_local_grammar(text, expected):
    result = run(text, mode="grammar")
    assert result.grammar.corrected_text == expected
    for error in result.grammar.errors:
        assert text[error.start:error.end] == error.original
        assert error.category and error.explanation


@pytest.mark.parametrize("text", ["I went to college yesterday and met my friends.", "I go home every day.",
    "She goes home.", "An hour is enough.", "I wanted to go yesterday and meet my friends.", "I would go if I had time.",
    "I suggested she go home.", 'The example says "she go home" for us to correct.'])
def test_correct_grammar_not_changed(text):
    assert run(text, mode="grammar").grammar.corrected_text == text


def test_punctuation_unicode_offsets():
    text = "🙂 I goes home. Café, naïve — hello!"
    result = run(text)
    assert result.grammar.corrected_text == "🙂 I go home. Café, naïve — hello!"
    assert result.grammar.errors[0].start == 4
    assert utf16_to_codepoint("🙂 I", 3) == 2


def test_repetition_context_specific_suggestions():
    result = run("I think this movie is good. The story is good and the acting is good.")
    assert any(w.word == "good" and w.count == 3 for w in result.vocabulary.repetitions)
    assert any("impressive" in s.suggestion for s in result.vocabulary.suggestions)
    assert result.vocabulary.mattr is None
    assert "length" in result.vocabulary.note


def test_chunks_actually_occur_in_original():
    text = "Regular exercise improves mental health. As a result, people often feel more energetic."
    result = run(text, mode="read")
    assert result.vocabulary.chunks
    assert all(text[c.start:c.end] == c.text for c in result.vocabulary.chunks)
    assert result.reading.questions[-1].id == "cause"


def test_mattr_long_sample():
    result = run(" ".join(["garden music book exercise running"]*15))
    assert result.vocabulary.mattr is not None
    assert 0 <= result.vocabulary.mattr <= 1


def test_fluency_duration_and_no_fabricated_acoustics():
    result = run("Um I mean I like like walking because it helps me relax and enjoy my day.", mode="speak", duration_seconds=30)
    assert result.fluency.words_per_minute == result.vocabulary.word_count*2
    assert result.fluency.filler_count == 4
    assert result.fluency.repetitions == ["like"]
    assert result.fluency.pause_seconds is None
    assert result.fluency.pronunciation_score is None
    assert result.fluency.score.version == "practice-v1"
    assert "not a certified" in result.fluency.score.label


def test_missing_duration_does_not_invent_pace():
    result = run("This is a short practice response about my favorite activity and my daily routine.", mode="speak")
    assert result.fluency.words_per_minute is None
    assert all(c.key != "session_pace" for c in result.fluency.score.components)
    assert run("Hello there", mode="speak").fluency.score is None


@pytest.mark.parametrize("reference,hypothesis,s,d,i", [
    ("I like tea", "I like tea",0,0,0), ("I like tea", "I love tea",1,0,0),
    ("I like tea", "I tea",0,1,0), ("I like tea", "I really like tea",0,0,1),
    ("Tea", "Tea is very very nice",0,0,4), ("café is open", "Café is open!",0,0,0),
])
def test_alignment_wer(reference,hypothesis,s,d,i):
    result = align(reference,hypothesis)
    assert (result.substitutions,result.deletions,result.insertions) == (s,d,i)
    assert result.wer == round((s+d+i)/len(reference.split()),4)
    assert "not pronunciation" in result.note


def test_alignment_bounds_and_empty_reference():
    with pytest.raises(ValueError): align(" ","hello")
    with pytest.raises(ValueError): align("word "*501,"word")


def test_phrase_boundaries():
    assert contains_phrase("In fact, it works.","in fact")
    assert not contains_phrase("painting is fun","in")


def test_semantic_failure_has_no_fake_score(monkeypatch):
    monkeypatch.setattr("app.semantics.embed",lambda _: None)
    result = run("Exercise helps me feel healthy.",prompt="What are the benefits of exercise?")
    assert result.semantics.status == "unavailable"
    assert result.semantics.similarity is None
    assert result.semantics.relevance == "not_assessed"


def test_semantic_vectors_are_one_signal(monkeypatch):
    import numpy as np
    monkeypatch.setattr("app.semantics.embed",lambda texts: [np.array([1.,0.]) for _ in texts])
    result = run("Exercise improves my mood.",prompt="What are the benefits of exercise?")
    assert result.semantics.relevance == "likely_related"
    assert "not correctness" in result.semantics.note


def test_languagetool_failure_partial(monkeypatch):
    import httpx
    from app import grammar
    monkeypatch.setattr(grammar,"settings",lambda: replace(settings(),languagetool_url="http://unreachable.test"))
    async def fail(*args,**kwargs): raise httpx.ConnectError("unavailable")
    monkeypatch.setattr(httpx.AsyncClient,"post",fail)
    result = run("She go home.")
    assert result.grammar.status == "partial"
    assert result.grammar.corrected_text == "She goes home."


@pytest.fixture
def client(monkeypatch):
    from app import main
    monkeypatch.setattr(main,"settings",lambda: replace(settings(),api_key="test-private-key"))
    with TestClient(app) as c:
        yield c


def test_api_auth_health_and_private_openapi(client):
    assert client.get("/health").status_code == 200
    assert client.post("/nlp/analyze",json={"text":"Hello"}).status_code == 401
    assert client.get("/openapi.json").status_code == 401
    assert client.get("/openapi.json",headers={"Authorization":"Bearer test-private-key"}).status_code == 200


@pytest.mark.parametrize("payload", [{"text":""},{"text":"   "},{"text":"a"*12001},{"text":123},
    {"text":"Hello","duration_seconds":0},{"text":"Hello","unknown":"field"},{"text":"🙂"}])
def test_api_validation(client,payload):
    response=client.post("/nlp/analyze",json=payload,headers={"Authorization":"Bearer test-private-key"})
    assert response.status_code == 422
    assert "input" not in response.json()["error"]  # No echo of private invalid text.


def test_api_bounded_body(client):
    response=client.post("/nlp/analyze",content=b"x"*100001,headers={"Authorization":"Bearer test-private-key"})
    assert response.status_code == 413


def test_api_structured_result(client):
    response=client.post("/nlp/analyze",json={"text":"She go home.","mode":"write"},headers={"Authorization":"Bearer test-private-key"})
    assert response.status_code == 200
    assert response.json()["grammar"]["corrected_text"] == "She goes home."
    assert response.headers["cache-control"] == "no-store"


def test_unicode_alignment_normalizes_equivalent_forms():
    assert align("I’m in a café", "I'm in a cafe\u0301").wer == 0


def test_languagetool_utf16_success(monkeypatch):
    import httpx
    from app import grammar
    monkeypatch.setattr(grammar,"settings",lambda: replace(settings(),languagetool_url="http://grammar.test"))
    async def response(*_args,**_kwargs):
        return httpx.Response(200,request=httpx.Request("POST","http://grammar.test/v2/check"),json={"software":{"version":"test-1"},"matches":[{"offset":3,"length":3,"message":"Check spelling.","replacements":[{"value":"the"}],"rule":{"id":"MORFOLOGIK_RULE_EN_US","category":{"id":"TYPOS"}}}]})
    monkeypatch.setattr(httpx.AsyncClient,"post",response)
    result=run("🙂 teh cat sleeps.")
    assert result.grammar.corrected_text == "🙂 the cat sleeps."
    assert result.grammar.errors[0].start == 2
    assert result.grammar.errors[0].category == "spelling"
    assert result.grammar.detector_version == "learner-rules-v1+LanguageTool:test-1"


def test_model_absence_does_not_invent_linguistic_annotations(monkeypatch):
    from app import pipeline as module
    monkeypatch.setattr(module,"_nlp",None)
    monkeypatch.setattr(module,"settings",lambda: replace(settings(),spacy_model="missing-model-fixture"))
    _,result=module.preprocess("Alice visits London.")
    assert not result.trained_pipeline
    assert result.entities == []
    assert all(t.pos is None for t in result.tokens)


def test_inference_failure_returns_unavailable_without_logging_text(monkeypatch,caplog):
    from app import pipeline as module
    class BrokenModel:
        def encode(self,*_args,**_kwargs): raise RuntimeError("model failed")
    monkeypatch.setattr(module,"_embedder",BrokenModel())
    monkeypatch.setattr(module,"_embedding_failed",False)
    monkeypatch.setattr(module,"settings",lambda: replace(settings(),embeddings_enabled=True))
    assert module.embed(["Private fixture input never belongs in logs"]) is None
    assert "Private fixture input" not in caplog.text


def test_missing_service_key_fails_closed(client,monkeypatch):
    from app import main
    monkeypatch.setattr(main,"settings",lambda: replace(settings(),api_key=""))
    assert client.post("/nlp/analyze",json={"text":"Hello there"}).status_code == 503
