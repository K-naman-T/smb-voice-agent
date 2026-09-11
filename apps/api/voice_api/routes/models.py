"""Models catalog API routes for the voice agent configurator."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

router = APIRouter(prefix="/models", tags=["models"])

REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent.parent
MANIFEST_PATH = REPO_ROOT / "deploy" / "models" / "manifest.json"


class ModelSpecResponse(BaseModel):
    id: str
    name: str
    kind: str
    runtime: str
    min_vram_mb: int
    license: str
    purpose: str
    latency_tier: str
    capabilities: List[str]
    recommended: bool = False
    filename: Optional[str] = None
    url: Optional[str] = None


class HardwareProfile(BaseModel):
    id: str
    name: str
    vram_gb: float
    platform: str
    recommended_concurrency: int
    runtime_engine: str
    target_environment: str
    description: str


HARDWARE_PROFILES: List[Dict[str, Any]] = [
    {
        "id": "cloud_l4_24gb",
        "name": "Public Cloud Demo (NVIDIA L4 / A10G)",
        "vram_gb": 24.0,
        "platform": "Cloud GPU (AWS / RunPod / Modal)",
        "recommended_concurrency": 12,
        "runtime_engine": "vLLM PagedAttention / CUDA 13.2",
        "target_environment": "public_demo",
        "description": "High-throughput cloud demo environment for multi-tenant public testing, high concurrency, and unquantized weights.",
    },
    {
        "id": "edge_rtx4060_8gb",
        "name": "Self-Hosted SMB Edge (RTX 4060)",
        "vram_gb": 8.0,
        "platform": "On-Premises Workstation / Edge Box",
        "recommended_concurrency": 2,
        "runtime_engine": "llama.cpp GPU Offload / CUDA",
        "target_environment": "on_prem_smb",
        "description": "Turnkey private edge appliance for clinics, HVAC, and trade offices. Sub-$900 hardware, zero cloud egress.",
    },
    {
        "id": "apple_silicon_36gb",
        "name": "Apple Silicon Studio (M-Series Unified)",
        "vram_gb": 36.0,
        "platform": "Mac Studio / Mac Mini M2/M3/M4",
        "recommended_concurrency": 16,
        "runtime_engine": "Apple Metal / MLX Engine",
        "target_environment": "office_studio",
        "description": "Silent desktop office server leveraging high unified memory bandwidth for large model contexts.",
    },
    {
        "id": "client_webgpu",
        "name": "In-Browser Client Sandbox (WebGPU / WASM)",
        "vram_gb": 0.0,
        "platform": "Client Browser (Zero Server GPU)",
        "recommended_concurrency": 999,
        "runtime_engine": "Web Audio + WebGPU / Web Speech API",
        "target_environment": "zero_cost_preview",
        "description": "Runs voice processing directly in the visitor's browser. Zero hosting GPU bill, unlimited public scale.",
    },
    {
        "id": "enterprise_h100_80gb",
        "name": "Enterprise Cluster (NVIDIA H100 / A100)",
        "vram_gb": 80.0,
        "platform": "Data Center High Density",
        "recommended_concurrency": 48,
        "runtime_engine": "TensorRT-LLM + Triton Server",
        "target_environment": "enterprise",
        "description": "High-density multi-line PBX / SIP trunking call center handling dozens of concurrent voice calls.",
    },
]


def _load_manifest() -> Dict[str, Any]:
    if not MANIFEST_PATH.is_file():
        return {"models": []}
    try:
        return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {"models": []}


MODEL_FRIENDLY_NAMES: Dict[str, Dict[str, Any]] = {
    "llm.chomp.fast": {
        "name": "Qwen 3.5 9B (Default Workhorse)",
        "latency_tier": "Snappy (~45ms TTFT)",
        "capabilities": ["json_schema", "slot_filling", "balanced_vram", "tool_calling"],
        "recommended": True,
    },
    "llm.chomp.balanced": {
        "name": "Qwen 2.5 7B Instruct",
        "latency_tier": "Standard (~55ms TTFT)",
        "capabilities": ["general_reasoning", "tool_calling", "instruct"],
        "recommended": False,
    },
    "llm.qwen3_8.flash_next": {
        "name": "Qwen 3.8 Flash-Next MoE (6B Active)",
        "latency_tier": "Ultra-Low (<30ms TTFT)",
        "capabilities": ["gated_deltanet", "agentic_loops", "sparse_attention", "deep_tool_chains", "moe"],
        "recommended": True,
    },
    "llm.muse.glimmer": {
        "name": "Meta Muse Glimmer 30B (Superintelligence)",
        "latency_tier": "Deep Reasoner (~90ms TTFT)",
        "capabilities": ["autonomous_recovery", "failure_diagnostics", "multi_step_agent", "apache_2_0"],
        "recommended": False,
    },
    "llm.qwen2_5.coder_7b": {
        "name": "Qwen 2.5-Coder 7B (BFCL Champion)",
        "latency_tier": "Fast (~40ms TTFT)",
        "capabilities": ["bfcl_leaderboard_1", "zero_syntax_errors", "strict_typing", "agentic"],
        "recommended": True,
    },
    "llm.vibethinker.3b": {
        "name": "VibeThinker 3B (Edge Speed)",
        "latency_tier": "Instant (<25ms TTFT)",
        "capabilities": ["sub_2gb_vram", "multi_stream_concurrency", "low_latency", "compact"],
        "recommended": False,
    },
    "s2s.nvidia.personaplex": {
        "name": "NVIDIA PersonaPlex-7B (Full-Duplex)",
        "latency_tier": "End-to-End (~160ms Audio, 15.3 fps)",
        "capabilities": ["full_duplex", "barge_in", "hybrid_prompting", "mimi_codec", "simultaneous_listen_talk"],
        "recommended": True,
    },
    "s2s.kyutai.moshi": {
        "name": "Kyutai Moshi 7B (Mimi Codec)",
        "latency_tier": "End-to-End (~160ms Audio)",
        "capabilities": ["full_duplex", "24khz_audio", "inner_monologue", "open_weights"],
        "recommended": False,
    },
    "stt.whisper.small": {
        "name": "Faster-Whisper Small (Baseline)",
        "latency_tier": "~100ms Finalize",
        "capabilities": ["int8_quant", "reliable", "900mb_vram"],
        "recommended": True,
    },
    "stt.whisper.turbo": {
        "name": "Whisper Large-v3-Turbo (809M)",
        "latency_tier": "~80ms Finalize",
        "capabilities": ["accent_robustness", "8x_speedup", "telephony_noise_filter"],
        "recommended": False,
    },
    "stt.moonshine": {
        "name": "Moonshine Edge ASR (Useful Sensors)",
        "latency_tier": "Ultra-Low (<40ms)",
        "capabilities": ["variable_length", "no_padding_overhead", "turn_taking_optimized", "edge_native"],
        "recommended": True,
    },
    "stt.sensevoice": {
        "name": "SenseVoice-Small (Alibaba FunASR)",
        "latency_tier": "Sub-50ms Ultra-Fast",
        "capabilities": ["emotion_detection", "event_tags", "multilingual_50_plus", "sentiment_aware"],
        "recommended": True,
    },
    "tts.kokoro.en": {
        "name": "Kokoro-82M (Studio Quality)",
        "latency_tier": "Instant (30x Real-time)",
        "capabilities": ["elevenlabs_parity", "0mb_gpu_vram", "apache_2_0", "natural_inflection"],
        "recommended": True,
    },
    "tts.chatterbox.turbo": {
        "name": "Chatterbox-Turbo (Conversational)",
        "latency_tier": "Sub-200ms",
        "capabilities": ["paralinguistic_tags", "laughter_sigh_support", "zero_shot_cloning", "mit_license"],
        "recommended": True,
    },
    "tts.cosyvoice.v2": {
        "name": "CosyVoice 2 (Streaming Flow)",
        "latency_tier": "~150ms First-Packet",
        "capabilities": ["conversational_fillers", "cross_lingual", "emotion_control", "causal_flow_matching"],
        "recommended": False,
    },
    "tts.piper.en": {
        "name": "Piper TTS Amy (Lightweight CPU)",
        "latency_tier": "~70ms",
        "capabilities": ["legacy_fallback", "zero_gpu_vram", "cpu_bound"],
        "recommended": False,
    },
    "tts.piper.hi": {
        "name": "Piper TTS Hindi",
        "latency_tier": "~70ms",
        "capabilities": ["hindi_accent", "zero_gpu_vram", "cpu_bound"],
        "recommended": False,
    },
}


@router.get("", response_model=List[ModelSpecResponse])
def list_models(
    kind: Optional[str] = Query(None, description="Filter by kind: llm, stt, tts, s2s"),
) -> List[ModelSpecResponse]:
    """List all supported self-hosted models available to the agent configurator."""
    manifest = _load_manifest()
    results = []
    for m in manifest.get("models", []):
        m_kind = m.get("kind", "")
        if kind and m_kind != kind:
            continue
        mid = m.get("id", "")
        meta = MODEL_FRIENDLY_NAMES.get(mid, {})
        results.append(
            ModelSpecResponse(
                id=mid,
                name=meta.get("name", mid),
                kind=m_kind,
                runtime=m.get("runtime", "unknown"),
                min_vram_mb=m.get("min_vram_mb", 0),
                license=m.get("license", "proprietary"),
                purpose=m.get("purpose", ""),
                latency_tier=meta.get("latency_tier", "Standard"),
                capabilities=meta.get("capabilities", []),
                recommended=meta.get("recommended", False),
                filename=m.get("filename"),
                url=m.get("url"),
            )
        )
    return results


@router.get("/presets")
def get_configurator_presets() -> Dict[str, Any]:
    """Curated architectural stacks for the Ultimate Voice Agent Configurator."""
    return {
        "presets": [
            {
                "id": "stack_state_machine_pro",
                "name": "Deterministic Booking Pro (Zero Hallucination)",
                "description": "Cascaded turn engine for strict slot filling, automated SMS confirmations, and transactional state machines.",
                "architecture": "cascaded",
                "llm": "llm.qwen2_5.coder_7b",
                "stt": "stt.moonshine",
                "tts": "tts.kokoro.en",
                "est_vram_mb": 5150,
                "est_turn_latency_ms": 320,
                "recommended_for": ["Clinics", "HVAC", "Legal Concierge", "Field Service Dispatch"],
            },
            {
                "id": "stack_agentic_moe",
                "name": "2026 Agentic MoE (Deep Tool Loops)",
                "description": "Cutting-edge hybrid Gated DeltaNet attention for multi-turn agent workflows and autonomous failure recovery.",
                "architecture": "cascaded",
                "llm": "llm.qwen3_8.flash_next",
                "stt": "stt.sensevoice",
                "tts": "tts.kokoro.en",
                "est_vram_mb": 5000,
                "est_turn_latency_ms": 280,
                "recommended_for": ["Complex Multi-Service Booking", "Emergency Triage", "Interactive Receptionist"],
            },
            {
                "id": "stack_expressive_human",
                "name": "Expressive Conversational Concierge",
                "description": "Features paralinguistic acoustic tags ([laugh], [sigh]) and caller emotion detection for high-empathy customer service.",
                "architecture": "cascaded",
                "llm": "llm.chomp.fast",
                "stt": "stt.sensevoice",
                "tts": "tts.chatterbox.turbo",
                "est_vram_mb": 3600,
                "est_turn_latency_ms": 340,
                "recommended_for": ["Hospitality", "Salon & Spa", "High-Touch Consulting"],
            },
            {
                "id": "stack_full_duplex_s2s",
                "name": "NVIDIA PersonaPlex Full-Duplex (Next-Gen)",
                "description": "Unified speech-to-speech foundation model with sub-200ms latency, native barge-in interruptions, and voice persona prompting.",
                "architecture": "full_duplex_s2s",
                "llm": "s2s.nvidia.personaplex",
                "stt": "s2s.nvidia.personaplex",
                "tts": "s2s.nvidia.personaplex",
                "est_vram_mb": 7264,
                "est_turn_latency_ms": 160,
                "recommended_for": ["High-Banter Chat", "Natural Virtual Characters", "Rapid Q&A Concierge"],
            },
            {
                "id": "stack_ultra_concurrency",
                "name": "Multi-Line High Concurrency (8GB VRAM)",
                "description": "Runs 3+ concurrent phone lines on a single RTX 4060 with sub-30ms TTFT using VibeThinker 3B + Moonshine.",
                "architecture": "cascaded",
                "llm": "llm.vibethinker.3b",
                "stt": "stt.moonshine",
                "tts": "tts.kokoro.en",
                "est_vram_mb": 2450,
                "est_turn_latency_ms": 260,
                "recommended_for": ["High-Volume Dispatchers", "Multi-Tenant Agencies"],
            },
        ]
    }


@router.get("/hardware-profiles", response_model=Dict[str, List[HardwareProfile]])
def get_hardware_profiles() -> Dict[str, List[HardwareProfile]]:
    """Return supported hardware targets and deployment environments."""
    return {"profiles": [HardwareProfile(**p) for p in HARDWARE_PROFILES]}
