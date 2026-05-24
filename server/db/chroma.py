import numpy as np
import chromadb
from typing import List, Dict, Any, Optional
from config import CHROMA_DIR

# Initialize ChromaDB Client
client = chromadb.PersistentClient(path=CHROMA_DIR)

# Collections mapping
collections = {
    "semantic_assets": client.get_or_create_collection("semantic_assets"),
    "grounding_registry": client.get_or_create_collection("grounding_registry"),
    "character_dialogue_vectors": client.get_or_create_collection("character_dialogue_vectors"),
    "concept_bible_vectors": client.get_or_create_collection("concept_bible_vectors"),
    "prose_style_snippets": client.get_or_create_collection("prose_style_snippets")
}

def mock_embedding(text: str, dimension: int = 384) -> List[float]:
    np.random.seed(sum(ord(c) for c in text) % 2**32)
    vec = np.random.randn(dimension)
    norm = np.linalg.norm(vec)
    if norm > 0:
        vec = vec / norm
    return vec.tolist()

# Semantic Assets
def add_vector_asset(collection_name: str, doc_id: str, document: str, metadata: Dict[str, Any]):
    collection = collections.get(collection_name)
    if not collection:
        return
    
    emb = mock_embedding(document)
    collection.add(
        ids=[doc_id],
        embeddings=[emb],
        documents=[document],
        metadatas=[metadata]
    )

def query_vector_assets(collection_name: str, query_text: str, project_id: str, limit: int = 5) -> List[Dict[str, Any]]:
    collection = collections.get(collection_name)
    if not collection:
        return []
    
    query_emb = mock_embedding(query_text)
    results = collection.query(
        query_embeddings=[query_emb],
        n_results=limit,
        where={"projectId": project_id}
    )
    
    formatted = []
    if results and "documents" in results and results["documents"]:
        docs = results["documents"][0]
        ids = results["ids"][0]
        metadatas = results["metadatas"][0] if "metadatas" in results else [{} for _ in range(len(docs))]
        distances = results["distances"][0] if "distances" in results else [0.0 for _ in range(len(docs))]
        
        for idx in range(len(docs)):
            formatted.append({
                "id": ids[idx],
                "document": docs[idx],
                "metadata": metadatas[idx],
                "score": float(1.0 - distances[idx])
            })
            
    return formatted

def delete_project_vectors(project_id: str):
    for collection in collections.values():
        try:
            collection.delete(where={"projectId": project_id})
        except Exception:
            pass
