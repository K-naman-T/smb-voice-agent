# SMB Voice Agent — OpenCode project rules

Repo path: **/home/knamant/smb-voice-agent** (not under projects/)

Read SESSION.md and docs/ENGINEERING_PLAN_v2.md first.

## Subagents
Always use opencode-go/deepseek-v4-flash for subagents, regardless of main model.

## Stack
llama.cpp llama-server + faster-whisper + Piper on chomp. No Ollama. No split inference over Tailscale.
