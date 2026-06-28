import pymongo
from app.config import MONGO_URI, MONGO_DB_NAME


def get_db():
    client = pymongo.MongoClient(MONGO_URI)
    return client[MONGO_DB_NAME]


def init_db():
    db = get_db()

    # Drop any stale unique index on "id" fields (legacy schema artifact)
    for collection_name in (
        "projects",
        "chapters",
        "character_bible",
        "entity_bible",
        "user_assets",
        "agent_runs",
        "artifacts",
        "chat_messages",
    ):
        collection = db[collection_name]
        for index in collection.list_indexes():
            if index["name"] == "id_1" and index.get("unique"):
                collection.drop_index(index["name"])

    # projectId FK indexes
    db.chapters.create_index("projectId")
    db.character_bible.create_index("projectId")
    db.entity_bible.create_index("projectId")
    db.user_assets.create_index("projectId")
    db.agent_runs.create_index("projectId")
    db.artifacts.create_index("projectId")
    db.chat_messages.create_index("projectId")

    # Sorting / range indexes
    db.projects.create_index([("createdAt", pymongo.DESCENDING)])
    db.chapters.create_index([("projectId", pymongo.ASCENDING), ("number", pymongo.ASCENDING)], unique=True)
    db.agent_runs.create_index([("projectId", pymongo.ASCENDING), ("startedAt", pymongo.DESCENDING)])
    db.artifacts.create_index([("projectId", pymongo.ASCENDING), ("createdAt", pymongo.DESCENDING)])
    db.chat_messages.create_index([("projectId", pymongo.ASCENDING), ("createdAt", pymongo.ASCENDING)])
    db.chat_messages.create_index([("projectId", pymongo.ASCENDING), ("threadId", pymongo.ASCENDING), ("createdAt", pymongo.ASCENDING)])
    db.agent_runs.create_index([("projectId", pymongo.ASCENDING), ("threadId", pymongo.ASCENDING), ("startedAt", pymongo.DESCENDING)])
    db.user_assets.create_index([("projectId", pymongo.ASCENDING), ("addedAt", pymongo.ASCENDING)])

    # Optional full-text indexes (legacy; semantic search uses Chroma)
    db.chapters.create_index([("title", pymongo.TEXT), ("summary", pymongo.TEXT)])
    db.character_bible.create_index([("name", pymongo.TEXT), ("arc", pymongo.TEXT)])
    db.entity_bible.create_index([("name", pymongo.TEXT), ("description", pymongo.TEXT)])
    db.user_assets.create_index([("name", pymongo.TEXT), ("content", pymongo.TEXT)])
