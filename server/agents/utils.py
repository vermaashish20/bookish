import os
import importlib.util


def load_prompt(name: str) -> str:
    prompt_name = name[:-3] if name.endswith(".py") else name
    path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "prompts",
        f"{prompt_name}.py",
    )
    try:
        spec = importlib.util.spec_from_file_location(f"prompts.{prompt_name}", path)
        if not spec or not spec.loader:
            return ""
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return getattr(module, "PROMPT", "")
    except Exception:
        return ""


def extract_json(text: str) -> str:
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1:
        return text[start:end+1]
    return text

