"""Update imports after client restructure."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

REPLACEMENTS = [
    ("from '../types'", "from '@/lib/types'"),
    ("from '../types;", "from '@/lib/types;"),
    ("from '../../types'", "from '@/lib/types'"),
    ("from '../components/", "from '@/components/workspace/"),
    ("from '../../components/", "from '@/components/workspace/"),
    ("from '../lib/api'", "from '@/lib/api'"),
    ("from '../../lib/api'", "from '@/lib/api'"),
]

for path in ROOT.rglob("*.tsx"):
    if "node_modules" in path.parts or ".next" in path.parts:
        continue
    if path.parts[-3:] == ("app", "components", path.name):
        continue  # skip old app/components if still exists
    text = path.read_text(encoding="utf-8")
    original = text
    for old, new in REPLACEMENTS:
        text = text.replace(old, new)
    if text != original:
        path.write_text(text, encoding="utf-8")
        print("fixed", path.relative_to(ROOT))
