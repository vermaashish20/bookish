"""
Embedding function singleton for ChromaDB (no dependency on services package).
"""
from __future__ import annotations

import logging
import os
import time
from functools import lru_cache
from typing import Any

logger = logging.getLogger(__name__)


class LoggingEmbeddingFunction:
    """Small wrapper that logs embedding batch lifecycle without changing providers."""

    def __init__(self, wrapped: Any, provider: str, model: str) -> None:
        self._wrapped = wrapped
        self.provider = provider
        self.model = model

    def name(self) -> str:
        wrapped_name = getattr(self._wrapped, "name", None)
        if callable(wrapped_name):
            return str(wrapped_name())
        if wrapped_name:
            return str(wrapped_name)
        return f"bookish-{self.provider}-{self.model}"

    def default_space(self) -> str:
        default_space = getattr(self._wrapped, "default_space", None)
        if callable(default_space):
            return str(default_space())
        return "cosine"

    def supported_spaces(self) -> list[str]:
        supported_spaces = getattr(self._wrapped, "supported_spaces", None)
        if callable(supported_spaces):
            return list(supported_spaces())
        return ["cosine", "l2", "ip"]

    def embed_query(self, input: str) -> Any:
        embed_query = getattr(self._wrapped, "embed_query", None)
        if callable(embed_query):
            return embed_query(input)
        return self([input])[0]

    def embed_documents(self, input: Any) -> Any:
        embed_documents = getattr(self._wrapped, "embed_documents", None)
        if callable(embed_documents):
            return embed_documents(input)
        return self(input)

    def __call__(self, input: Any) -> Any:
        texts = list(input or [])
        total_chars = sum(len(str(text)) for text in texts)
        logger.info(
            "[Embeddings] start provider=%s model=%s batch=%s chars=%s",
            self.provider,
            self.model,
            len(texts),
            total_chars,
        )
        start = time.perf_counter()
        try:
            embeddings = self._wrapped(texts)
        except Exception:
            elapsed_ms = (time.perf_counter() - start) * 1000
            logger.exception(
                "[Embeddings] failed provider=%s model=%s batch=%s elapsed_ms=%.1f",
                self.provider,
                self.model,
                len(texts),
                elapsed_ms,
            )
            raise

        elapsed_ms = (time.perf_counter() - start) * 1000
        dimension = len(embeddings[0]) if embeddings else 0
        logger.info(
            "[Embeddings] completed provider=%s model=%s batch=%s dimension=%s elapsed_ms=%.1f",
            self.provider,
            self.model,
            len(texts),
            dimension,
            elapsed_ms,
        )
        return embeddings


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
            logger.info("Using OpenAI embeddings: %s", model)
            return LoggingEmbeddingFunction(
                OpenAIEmbeddingFunction(api_key=api_key, model_name=model),
                provider="openai",
                model=model,
            )

    from chromadb.utils.embedding_functions import DefaultEmbeddingFunction

    logger.info("Using Chroma default embeddings (local ONNX)")
    return LoggingEmbeddingFunction(
        DefaultEmbeddingFunction(),
        provider="chroma-default",
        model="local-onnx-default",
    )
