"""Local STT route using FasterWhisper (§2.10).

Provides private, offline audio-to-text transcription without external cloud dependencies.
"""
from __future__ import annotations

import glob
import logging
import os
import tempfile
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, File, HTTPException, UploadFile
from runtime_contracts.stt import FasterWhisperSTT

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/stt", tags=["stt"])

_stt_instance: Optional[FasterWhisperSTT] = None


def get_stt_engine() -> FasterWhisperSTT:
    """Lazily initialize and return the local FasterWhisper STT engine."""
    global _stt_instance
    if _stt_instance is None:
        snaps = glob.glob("/home/knamant/.cache/huggingface/hub/models--Systran--faster-whisper-tiny/snapshots/*")
        model_path = snaps[0] if snaps else "tiny"
        logger.info(f"Initializing FasterWhisperSTT with model: {model_path}")
        _stt_instance = FasterWhisperSTT(
            model_size_or_path=model_path,
            device="cpu",
            compute_type="int8",
            language="en",
        )
    return _stt_instance


@router.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """Transcribe an uploaded audio file (wav, webm, ogg, mp4) to text locally."""
    contents = await file.read()
    if not contents or len(contents) < 500:
        return {"text": ""}

    stt = get_stt_engine()
    suffix = Path(file.filename or "speech.webm").suffix or ".webm"

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(contents)
        tmp_path = tmp.name

    try:
        model = stt._ensure_model()
        segments, _ = model.transcribe(tmp_path, language=None, beam_size=1)
        transcript = " ".join(s.text.strip() for s in segments).strip()
        logger.info(f"Local FasterWhisper transcribed ({len(contents)} bytes): '{transcript}'")
        return {"text": transcript}
    except Exception as e:
        logger.warning(f"Local transcription failed: {e}")
        return {"text": "", "error": str(e)}
    finally:
        Path(tmp_path).unlink(missing_ok=True)
