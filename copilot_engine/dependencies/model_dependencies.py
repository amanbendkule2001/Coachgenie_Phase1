# ai/dependencies/model_dependencies.py

from copilot_engine.core.model_router import ModelRouter


def get_model_router() -> ModelRouter:

    return ModelRouter()