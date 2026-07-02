from typing import Any, Dict, List

from bson import ObjectId

from app.infrastructure.database.mongo import get_db
from app.services.indexing import enqueue_index_entity, unindex
from app.core.streaming import publish_sync_event


def _entity_memory_payload(entity: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": entity.get("_id") or entity.get("id"),
        "name": entity.get("name", "Unnamed Entity"),
        "type": entity.get("type", "concept"),
        "description": entity.get("description", ""),
        "attributes": entity.get("attributes", {}),
        "status": entity.get("status", "draft"),
    }


def add_entity(
    project_id: str,
    name: str,
    entity_type: str,  # "location", "object", "organization", "concept", etc.
    description: str,
    attributes: Dict[str, Any],
    status: str = "draft"  # "draft" or "published"
):
    """Add a new entity (place, object, organization, etc.) to the world bible"""
    db = get_db()
    entity_id = f"entity_{ObjectId()}"
    entity = {
        "_id": entity_id,
        "projectId": project_id,
        "name": name,
        "type": entity_type,
        "description": description,
        "attributes": attributes,
        "status": status,
    }
    db.entity_bible.insert_one(entity)
    enqueue_index_entity(project_id, entity_id)
    publish_sync_event("memory_upserted", item=_entity_memory_payload(entity))
    return entity_id


def get_project_entities(project_id: str, entity_type: str = None) -> List[Dict[str, Any]]:
    """Get all entities for a project, optionally filtered by type"""
    db = get_db()
    query = {"projectId": project_id}
    if entity_type:
        query["type"] = entity_type
    
    entities = list(db.entity_bible.find(query))
    for entity in entities:
        entity["id"] = entity["_id"]
    return entities


def update_entity(
    entity_id: str,
    name: str = None,
    description: str = None,
    attributes: Dict[str, Any] = None,
    status: str = None
):
    """Update an existing entity"""
    db = get_db()
    update_fields = {}
    
    if name is not None:
        update_fields["name"] = name
    if description is not None:
        update_fields["description"] = description
    if attributes is not None:
        update_fields["attributes"] = attributes
    if status is not None:
        update_fields["status"] = status
    
    if update_fields:
        db.entity_bible.update_one(
            {"_id": entity_id},
            {"$set": update_fields}
        )
        doc = db.entity_bible.find_one({"_id": entity_id}, {"projectId": 1})
        if doc:
            enqueue_index_entity(doc["projectId"], entity_id)
            updated = db.entity_bible.find_one({"_id": entity_id})
            if updated:
                updated["id"] = updated["_id"]
                publish_sync_event("memory_upserted", item=_entity_memory_payload(updated))


def delete_entity(entity_id: str):
    """Delete an entity"""
    db = get_db()
    existing = db.entity_bible.find_one({"_id": entity_id}, {"_id": 1})
    db.entity_bible.delete_one({"_id": entity_id})
    unindex(entity_id, "world_system")
    if existing:
        publish_sync_event("memory_deleted", id=entity_id)
