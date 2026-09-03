"""Atomic barge-in and sentence watermark manager (§2.7).

Maintains a queue of sentences dispatched to TTS with start times and durations.
When user barge-in occurs at timestamp t_b:
  - Sentences that finished playing before t_b + 50ms are considered spoken.
  - Partial sentences currently playing are dropped (no half-sentence commits).
  - Unspoken sentences in the queue are cancelled.
  - Conversation history reflects only sentences actually heard by the caller (R18).
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional


@dataclass
class SentenceItem:
    sentence_id: str
    text: str
    duration_ms: float
    t_play_start_ms: Optional[float] = None
    played_to_completion: bool = False


class BargeManager:
    """Manages sentence playout state and history watermark upon interruption."""

    def __init__(self, slack_ms: float = 50.0) -> None:
        self.slack_ms = slack_ms
        self.queue: List[SentenceItem] = []
        self.generation_id: int = 0
        self.interrupted: bool = False

    def new_turn(self) -> int:
        """Advance generation ID, invalidating previous in-flight turns."""
        self.generation_id += 1
        self.queue.clear()
        self.interrupted = False
        return self.generation_id

    def enqueue_sentence(self, sentence_id: str, text: str, duration_ms: float) -> SentenceItem:
        """Enqueue a synthesized sentence for playout."""
        item = SentenceItem(
            sentence_id=sentence_id,
            text=text.strip(),
            duration_ms=duration_ms,
        )
        self.queue.append(item)
        return item

    def mark_playout_started(self, sentence_id: str, t_start_ms: float) -> None:
        """Record the timestamp when sentence playout began."""
        for item in self.queue:
            if item.sentence_id == sentence_id:
                item.t_play_start_ms = t_start_ms
                break

    def handle_barge_in(self, t_barge_ms: float) -> str:
        """Process an interruption at timestamp t_barge_ms.

        Returns the truncated assistant text containing only fully-played sentences.
        """
        self.interrupted = True
        spoken_sentences: List[str] = []

        for item in self.queue:
            if item.t_play_start_ms is None:
                # Playout hadn't started yet; drop
                continue

            playout_end_ms = item.t_play_start_ms + item.duration_ms
            # Finished playing before barge timestamp (+ slack allowance)
            if playout_end_ms <= t_barge_ms + self.slack_ms:
                item.played_to_completion = True
                spoken_sentences.append(item.text)
            else:
                # Was playing when interrupted; drop partial sentence (§2.7)
                item.played_to_completion = False
                break

        # Discard any remaining unplayed items from the active queue
        self.queue = [item for item in self.queue if item.played_to_completion]
        return " ".join(spoken_sentences)

    def get_full_assistant_history(self) -> str:
        """Return all text that was spoken (or completed) in this turn."""
        return " ".join(item.text for item in self.queue)
