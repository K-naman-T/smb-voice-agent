"""Sentence aggregation for streaming TTS playout (§2.5).

Splits streaming token deltas into natural sentence units so TTS synthesis
can begin early. Avoids splitting on:
  - Honorifics/titles: Mr., Mrs., Ms., Dr., Prof., St., Ave., Rd., Blvd., Dept., No., vs.
  - Decimals, currency, metrics: 3.5, $12.50, ₹500.00, 2.4ghz, 410a, p.m., a.m.
Flushes early if buffer exceeds max_chars (100) or elapsed time exceeds max_ms (400).
"""
from __future__ import annotations

import re
import time
from typing import List, Optional

# Honorifics and title abbreviations that should never end a sentence
_HONORIFICS = {
    "mr", "mrs", "ms", "dr", "prof", "st", "ave", "rd", "blvd",
    "dept", "no", "vs", "approx", "inc", "ltd", "corp"
}

# Non-terminal abbreviations that only end a sentence if followed by capitalized word
_DISCRETIONARY_ABBREVIATIONS = {
    "etc", "am", "pm", "ie", "eg"
}

_TERMINATOR_RE = re.compile(r'([.!?]+)(?:\s+|$)')


class SentenceAggregator:
    """Aggregates streaming token chunks into pronounceable sentences."""

    def __init__(self, max_chars: int = 100, max_hold_ms: float = 400.0) -> None:
        self.max_chars = max_chars
        self.max_hold_ms = max_hold_ms
        self.buffer = ""
        self.last_token_time: Optional[float] = None

    def _is_protected_period(self, text: str, dot_pos: int, match_end: int) -> bool:
        """Check if dot at dot_pos should NOT split the sentence."""
        prefix = text[:dot_pos].strip()
        last_word = prefix.split()[-1] if prefix.split() else ""
        clean_word = re.sub(r'[^a-zA-Z]', '', last_word).lower()

        # Check what follows the period + whitespace
        remainder = text[match_end:]
        next_char = remainder.lstrip()[:1]

        # If remainder is empty, we do not know what follows yet; hold buffer for next token
        if not next_char:
            return True

        # If next word starts with lowercase, it cannot be a new sentence
        if next_char.islower():
            return True

        # Number / Decimal / Currency / Measurement check (e.g. "3.5", "$12.50")
        before_char = text[dot_pos - 1] if dot_pos > 0 else ""
        after_char = text[dot_pos + 1] if dot_pos + 1 < len(text) else ""
        if before_char.isdigit() and after_char.isdigit():
            return True

        # Honorifics (Mr., Dr., etc.) are always protected even if next char is Uppercase
        if clean_word in _HONORIFICS:
            return True

        # Time abbreviations like p.m. / a.m. followed by lowercase are protected
        if clean_word in {"pm", "am", "m"} and "." in last_word:
            if not next_char.isupper():
                return True

        # Discretionary: etc., eg., ie. — split only if followed by uppercase
        if clean_word in _DISCRETIONARY_ABBREVIATIONS:
            if not next_char.isupper():
                return True

        return False

    def push(self, token: str) -> List[str]:
        """Push a token delta and return any completed sentences."""
        if not token:
            return []

        self.buffer += token
        self.last_token_time = time.monotonic()

        sentences: List[str] = []

        search_pos = 0
        while search_pos < len(self.buffer):
            match = _TERMINATOR_RE.search(self.buffer, search_pos)
            if not match:
                break

            term_start, term_end = match.span()
            dot_pos = term_start

            if self.buffer[dot_pos] == '.' and self._is_protected_period(self.buffer, dot_pos, term_end):
                search_pos = term_end
                continue

            sentence = self.buffer[:term_end].strip()
            self.buffer = self.buffer[term_end:].lstrip()
            if sentence:
                sentences.append(sentence)
            search_pos = 0

        # Force flush if buffer exceeded max_chars
        if len(self.buffer) >= self.max_chars:
            split_idx = self.buffer.rfind(',', 0, self.max_chars)
            if split_idx == -1:
                split_idx = self.buffer.rfind(' ', 0, self.max_chars)
            if split_idx > 0:
                sentence = self.buffer[:split_idx + 1].strip()
                self.buffer = self.buffer[split_idx + 1:].lstrip()
                if sentence:
                    sentences.append(sentence)

        return sentences

    def flush(self) -> List[str]:
        """Flush remaining buffered text upon stream completion."""
        res: List[str] = []
        rem = self.buffer.strip()
        self.buffer = ""
        self.last_token_time = None
        if rem:
            res.append(rem)
        return res
