# HANDOFF

**Repo (flex and chomp):** `/home/knamant/smb-voice-agent`  
Outside `projects/`. On chomp, `~/projects/smb-voice-agent` → symlink to home.

**Read first:** docs/ENGINEERING_PLAN_v2.md (v2.1) and SESSION.md

## Stack
LLM = **llama.cpp llama-server** on 127.0.0.1:8083 — **not Ollama**.

## OpenCode (chomp)
http://100.98.30.12:4096 — cwd `/home/knamant/smb-voice-agent`

## Next
P1: build llama-server + warmup + contract tests + vram-profile.sh
