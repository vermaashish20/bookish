"""
Embedding function singleton for ChromaDB (no dependency on services package).
"""
from __future__ import annotations

import logging
import os
from functools import lru_cache
from typing import Any

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def get_embedding_function() -> Any:
    provider = os.getenv("EMBEDDING_PROVIDER", "default").strip().lower()

    if provider == "openai":
        api_key = os.getenv("OPENAI_API_KEY", "")
        if not api_key:
            logger.warning("EMBEDDING_PROVIDER=openai but OPENAI_API_KEY missing; using default.")
        else:
            from chromadb.utils.embedding_functions import OpenAIEmbeddingFunction

            model = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")
            return OpenAIEmbeddingFunction(api_key=api_key, model_name=model)

    from chromadb.utils.embedding_functions import DefaultEmbeddingFunction

    return DefaultEmbeddingFunction()
