from __future__ import annotations
import os
from livekit.agents import WorkerOptions, cli
from providers import load_config, create_all_providers


def entrypoint(ctx):
    config_path = os.getenv("CONFIG_PATH", "config.toml")
    config = load_config(config_path)
    providers = create_all_providers(config)

    from .receptionist import ReceptionistAgent
    agent = ReceptionistAgent(ctx, providers)
    agent.start()


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(entrypoint_fnc=entrypoint),
    )
