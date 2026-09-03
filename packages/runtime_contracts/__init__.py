"""runtime_contracts — deployment policy enforcement.

I3 (normative): STT/LLM/TTS behind interfaces; default local;
   cloud adapters cannot import into local-private.
I7 (normative): local-private = egress allowlist empty; fail-closed.
"""

from runtime_contracts.deployment import (
    DeploymentMode,
    DeploymentPolicy,
    CloudProviderError,
)
from runtime_contracts.llm_client import (
    LlamaServerClient,
    LlamaServerError,
    LlamaAuthError,
)
from runtime_contracts.gpu_lock import (
    GPULock,
    GPULockTimeoutError,
    gpu_lock,
)
from runtime_contracts.stt import (
    FasterWhisperSTT,
    STTError,
)
from runtime_contracts.tts import (
    PiperTTS,
    TTSError,
)

__all__ = [
    "DeploymentMode",
    "DeploymentPolicy",
    "CloudProviderError",
    "LlamaServerClient",
    "LlamaServerError",
    "LlamaAuthError",
    "GPULock",
    "GPULockTimeoutError",
    "gpu_lock",
    "FasterWhisperSTT",
    "STTError",
    "PiperTTS",
    "TTSError",
]
