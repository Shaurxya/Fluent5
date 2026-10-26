"""Run from nlp-service: python -m evaluation.evaluate. No paid API calls."""
import asyncio
import json
import statistics
from datetime import datetime, timezone
from pathlib import Path
from app.engine import analyze
from app.schemas import AnalyzeRequest, AnalysisResponse
from app.shadowing import align


async def main():
    samples = json.loads(Path("evaluation/samples.json").read_text())
    tp=fp=fn=exact=structured=0
    latencies=[]
    for sample in samples["grammar"]:
        result=await analyze(AnalyzeRequest(mode="grammar",text=sample["text"]))
        predicted={(e.start,e.end) for e in result.grammar.errors}
        gold={tuple(e) for e in sample["errors"]}
        tp+=len(predicted & gold);fp+=len(predicted-gold);fn+=len(gold-predicted)
        exact+=int(result.grammar.corrected_text == sample["corrected"])
        structured+=int(AnalysisResponse.model_validate_json(result.model_dump_json()) == result)
        latencies.append(result.latency_ms)
    semantic=[]
    semantic_details=[]
    for sample in samples["semantic"]:
        result=await analyze(AnalyzeRequest(mode="semantics",text=sample["text"],prompt=sample["prompt"]))
        if result.semantics.status == "available":
            semantic.append((result.semantics.similarity >= 0.35) == sample["related"])
            semantic_details.append({"similarity":result.semantics.similarity,"expected_related":sample["related"],"latency_ms":result.latency_ms})
    report={"scope":"Small original development set; not held-out, representative, or a certified assessment.",
        "grammar_samples":len(samples["grammar"]),"error_span_precision":tp/max(1,tp+fp),"error_span_recall":tp/max(1,tp+fn),
        "correction_exact_match":exact/len(samples["grammar"]),"structured_output_roundtrip":structured/len(samples["grammar"]),
        "alignment_cases":len(samples["alignment"]),"wer_exact_match":sum(align(s["reference"],s["text"]).wer==s["wer"] for s in samples["alignment"])/len(samples["alignment"]),
        "semantic_evaluated":len(semantic),"semantic_label_accuracy":sum(semantic)/len(semantic) if semantic else None,
        "latency_ms_median":statistics.median(latencies),"latency_ms_max":max(latencies),
        "measured_at_utc":datetime.now(timezone.utc).isoformat(),"models":result.model_info.model_dump(),
        "grammar_true_positives":tp,"grammar_false_positives":fp,"grammar_false_negatives":fn,"semantic_cases":semantic_details}
    Path("evaluation/results.json").write_text(json.dumps(report,indent=2)+"\n")
    print(json.dumps(report,indent=2))


if __name__ == "__main__": asyncio.run(main())
