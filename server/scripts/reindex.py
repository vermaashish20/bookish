#!/usr/bin/env python
"""Rebuild Chroma vectors for a project from MongoDB.

Usage (from server/):
  uv run python scripts/reindex.py <project_id>
"""
import sys

from app.services.indexing import reindex_project


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python scripts/reindex.py <project_id>")
        sys.exit(1)
    project_id = sys.argv[1]
    reindex_project(project_id)
    print(f"Reindexed project {project_id}")


if __name__ == "__main__":
    main()
