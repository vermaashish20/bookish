from typing import Tuple


SUPPORTED_EXTENSIONS = {".md", ".txt"}


def get_asset_type(filename: str, fallback: str = "Text Guidelines") -> str:
    lower_name = filename.lower()
    if lower_name.endswith(".md"):
        return "Markdown File"
    if lower_name.endswith(".txt"):
        return "Text Guidelines"
    return fallback


def parse_asset_file(filename: str, data: bytes) -> Tuple[str, str]:
    lower_name = filename.lower()
    if lower_name.endswith(".md"):
        return _decode_text(data), "Markdown File"
    if lower_name.endswith(".txt"):
        return _decode_text(data), "Text Guidelines"
    raise ValueError("Unsupported file type. Please upload a Markdown or text file.")


def _decode_text(data: bytes) -> str:
    for encoding in ("utf-8-sig", "utf-8", "latin-1"):
        try:
            return data.decode(encoding).strip()
        except UnicodeDecodeError:
            continue
    return data.decode("utf-8", errors="ignore").strip()
