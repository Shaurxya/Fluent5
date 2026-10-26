"""Explicit operator step; models are never downloaded during analysis."""
import os
from pathlib import Path
from huggingface_hub import snapshot_download

snapshot_download("sentence-transformers/all-MiniLM-L6-v2",
    cache_dir=os.getenv("NLP_MODEL_CACHE", str(Path(__file__).resolve().parents[1] / ".model-cache" / "hub")),
    revision=os.getenv("EMBEDDING_REVISION", "c9745ed1d9f207416be6d2e6f8de32d1f16199bf"),
    ignore_patterns=["onnx/*", "openvino/*", "*.h5", "rust_model.ot", "pytorch_model.bin"])
