"""Reproduce contract fixtures from the real pipeline; never connect to learner storage."""
import asyncio
import sys
from pathlib import Path

service_root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(service_root))
from app.engine import analyze  # noqa: E402
from app.schemas import AnalyzeRequest  # noqa: E402

TEXT = "I goes to college yesterday and meet my friends. I think this movie is good. The story is good and the acting is good."


async def main() -> None:
    output = service_root.parent / "tests" / "fixtures"
    output.mkdir(parents=True, exist_ok=True)
    for mode in ("cycle", "write", "shadow", "read"):
        result = await analyze(AnalyzeRequest(text=TEXT, mode=mode,
            reference="I went to college yesterday and met my friends." if mode == "shadow" else "",
            duration_seconds=90 if mode in ("cycle", "shadow") else None))
        (output / f"{mode}-analysis.json").write_text(result.model_dump_json(indent=2) + "\n")


if __name__ == "__main__":
    asyncio.run(main())
