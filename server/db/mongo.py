import pymongo
from config import MONGO_URI, MONGO_DB_NAME

def get_db():
    client = pymongo.MongoClient(MONGO_URI)
    return client[MONGO_DB_NAME]

def init_db():
    db = get_db()

    for collection_name in (
        "projects",
        "chapters",
        "episodic_logs",
        "character_bible",
        "callback_index",
        "user_assets",
    ):
        collection = db[collection_name]
        for index in collection.list_indexes():
            if index["name"] == "id_1" and index.get("unique"):
                collection.drop_index(index["name"])
    
    # Index projectId for foreign key-like queries
    db.chapters.create_index("projectId")
    db.episodic_logs.create_index("projectId")
    db.character_bible.create_index("projectId")
    db.callback_index.create_index("projectId")
    db.user_assets.create_index("projectId")
    
    # Index for sorting projects by creation date (descending)
    db.projects.create_index([("createdAt", pymongo.DESCENDING)])
    
    # Compound index for asset queries (projectId + addedAt for sorting)
    db.user_assets.create_index([("projectId", pymongo.ASCENDING), ("addedAt", pymongo.ASCENDING)])

