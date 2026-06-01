"""Application-wide exceptions."""


class RunAbortedError(Exception):
    """User rejected a human-in-the-loop confirmation step."""
