"""LangGraph persistence factories."""
from __future__ import annotations

import logging
from typing import Any

from langgraph.checkpoint.memory import MemorySaver
from langgraph.store.memory import InMemoryStore

from app.config import MONGO_DB_NAME, MONGO_URI

logger = logging.getLogger(__name__)


def build_checkpointer() -> Any:
    """
    Build the async graph checkpointer.

    The agent is streamed through LangGraph's async APIs, so the checkpointer
    must implement async checkpoint methods. MongoDB is already the app's
    persistent database, making it the durable default for graph checkpoints.
    """
    try:
        from langgraph.checkpoint.mongodb import MongoDBSaver
        from pymongo import MongoClient

        saver = MongoDBSaver(
            client=MongoClient(MONGO_URI),
            db_name=MONGO_DB_NAME,
        )
        setup = getattr(saver, "setup", None)
        if callable(setup):
            setup()
        return saver
    except Exception as exc:
        logger.warning(
            "Falling back to in-memory LangGraph checkpointer after MongoDB setup failed: %s",
            exc,
        )
        return MemorySaver()


def build_store() -> Any:
    """Build the long-term runtime store for cross-thread agent memory."""
    try:
        from langgraph.store.mongodb import MongoDBStore
        from pymongo import MongoClient

        store = MongoDBStore(
            client=MongoClient(MONGO_URI),
            db_name=MONGO_DB_NAME,
        )
        setup = getattr(store, "setup", None)
        if callable(setup):
            setup()
        return store
    except Exception as exc:
        logger.warning(
            "Falling back to in-memory LangGraph store after MongoDB setup failed: %s",
            exc,
        )
        return InMemoryStore()

