import os
import re
import httpx
import numpy as np
import tensorflow as tf
import tensorflow_hub as hub
from PIL import Image
from fastapi import HTTPException
from starlette.concurrency import run_in_threadpool

MODEL_URL = os.getenv("MODEL_URL")
PEXELS_API_KEY = os.getenv("PEXELS_API_KEY")
PEXELS_SEARCH_URL = os.getenv("PEXELS_SEARCH_URL")

STYLE_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "styles")

# Module-level singleton — the Magenta model loads once at import time
# and is reused across every request, avoiding repeated load cost.
_model = None


def _get_model():
    global _model
    if _model is None:
        _model = hub.load(MODEL_URL)
    return _model


def _normalize_style_name(style: str) -> str:
    # "Watercolor Painting!" -> "watercolor_painting" -> safe cache filename
    return re.sub(r"[^a-z0-9]+", "_", style.strip().lower()).strip("_")


async def _fetch_style_reference_image(style: str, cache_path: str) -> None:
    if not PEXELS_API_KEY:
        raise HTTPException(status_code=500, detail="PEXELS_API_KEY is not configured.")

    query = f"{style} texture painting"
    headers = {"Authorization": PEXELS_API_KEY}
    params = {"query": query, "per_page": 1, "orientation": "square"}

    async with httpx.AsyncClient(timeout=20.0) as client:
        try:
            resp = await client.get(PEXELS_SEARCH_URL, headers=headers, params=params)
            resp.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=502, detail=f"Pexels search failed: {e.response.status_code}")
        except httpx.RequestError as e:
            raise HTTPException(status_code=502, detail=f"Pexels request error: {str(e)}")

        data = resp.json()
        photos = data.get("photos", [])
        if not photos:
            raise HTTPException(status_code=404, detail=f"No reference image found for style '{style}'.")

        image_url = photos[0]["src"]["large"]
        img_resp = await client.get(image_url)
        img_resp.raise_for_status()

    os.makedirs(STYLE_DIR, exist_ok=True)
    with open(cache_path, "wb") as f:
        f.write(img_resp.content)


async def _ensure_style_reference(style: str) -> str:
    # Cache lookup: only fetch from Pexels the first time this exact style
    # string is requested. Every subsequent call for the same style reuses
    # the cached file — no repeated network calls, no manual sourcing.
    normalized = _normalize_style_name(style)
    cache_path = os.path.join(STYLE_DIR, f"{normalized}.jpg")
    if not os.path.exists(cache_path):
        await _fetch_style_reference_image(style, cache_path)
    return cache_path


def _load_image_as_tensor(path: str, max_dim: int) -> tf.Tensor:
    img = Image.open(path).convert("RGB")
    img.thumbnail((max_dim, max_dim))
    arr = np.array(img).astype(np.float32) / 255.0
    return tf.convert_to_tensor(arr)[tf.newaxis, ...]


def _tensor_to_image(tensor) -> Image.Image:
    arr = np.array(tensor[0] * 255, dtype=np.uint8)
    return Image.fromarray(arr)


def _run_stylization_sync(input_image_path: str, output_image_path: str, style_reference_path: str) -> None:
    content_tensor = _load_image_as_tensor(input_image_path, max_dim=512)
    style_tensor = _load_image_as_tensor(style_reference_path, max_dim=256)  # model trained on 256px style inputs

    model = _get_model()
    outputs = model(tf.constant(content_tensor), tf.constant(style_tensor))
    result = _tensor_to_image(outputs[0])
    result.save(output_image_path)


async def apply_style_transfer(input_image_path: str, output_image_path: str, style: str) -> None:
    style_reference_path = await _ensure_style_reference(style)

    # TF inference is blocking (even though fast, ~1-3s on CPU) — run off
    # the event loop thread so it doesn't stall other concurrent requests.
    await run_in_threadpool(
        _run_stylization_sync, input_image_path, output_image_path, style_reference_path
    )