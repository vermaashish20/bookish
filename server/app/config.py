import os
from pathlib import Path

from dotenv import load_dotenv

# server/ (project root for data paths)
SERVER_ROOT = Path(__file__).resolve().parent.parent

# Load .env from server root
load_dotenv(dotenv_path=SERVER_ROOT / ".env")

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "bookish")

CHROMA_DIR = os.getenv("CHROMA_DIR", str(SERVER_ROOT / "chroma_db"))

PROJECT_KNOWLEDGE_COLLECTION = os.getenv("PROJECT_KNOWLEDGE_COLLECTION", "project_knowledge")

NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY")

# Embeddings: default = local ONNX (Chroma DefaultEmbeddingFunction)
EMBEDDING_PROVIDER = os.getenv("EMBEDDING_PROVIDER", "default")
OPENAI_EMBEDDING_MODEL = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")
