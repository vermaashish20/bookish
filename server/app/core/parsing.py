"""JSON / text parsing helpers for LLM outputs."""


def extract_json(text: str) -> str:
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1:
        return text[start : end + 1]
    return text
