"""Human-in-the-loop pause/resume registry (in-process, per run_id)."""
import logging
import threading
from typing import Dict, Optional

logger = logging.getLogger(__name__)

_active: Dict[str, Dict] = {}


def create_hitl_event(run_id: str) -> threading.Event:
    event = threading.Event()
    _active[run_id] = {"event": event, "response": None}
    logger.debug("HITL pause registered for run %s", run_id)
    return event


def resume_hitl_event(run_id: str, response: str) -> bool:
    entry = _active.get(run_id)
    if not entry:
        logger.warning("HITL resume failed: unknown run_id %s", run_id)
        return False
    entry["response"] = response
    entry["event"].set()
    return True


def get_hitl_response(run_id: str) -> Optional[str]:
    entry = _active.pop(run_id, None)
    if not entry:
        return None
    return entry.get("response")
