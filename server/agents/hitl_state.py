import threading

# Global registry of active confirmations: { run_id: {"event": threading.Event(), "response": None} }
active_confirmations = {}

def create_hitl_event(run_id: str):
    """Register a new HITL pause event for a run."""
    event = threading.Event()
    active_confirmations[run_id] = {
        "event": event,
        "response": None
    }
    return event

def resume_hitl_event(run_id: str, response: str) -> bool:
    """Set the user's response and resume the paused thread. Returns True if successful."""
    if run_id in active_confirmations:
        active_confirmations[run_id]["response"] = response
        active_confirmations[run_id]["event"].set()
        return True
    return False

def get_hitl_response(run_id: str) -> str:
    """Retrieve the response and cleanup the event."""
    if run_id in active_confirmations:
        response = active_confirmations[run_id]["response"]
        del active_confirmations[run_id]
        return response
    return None
