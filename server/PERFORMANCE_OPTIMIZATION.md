# Performance Optimization Guide

## Problem: Slow Project List Loading (2-4 seconds)

### Root Cause
The original `GET /api/projects` endpoint was calling `get_unified_project_payload()` for each project, which made **6 database queries per project**:

1. `get_project()` - Project details
2. `get_project_chapters()` - All chapters with full content
3. `get_project_characters()` - All character data
4. `get_project_callbacks()` - All callback data
5. `get_project_assets()` - All assets with full content
6. `get_project_logs()` - All logs

**Example:** With 3 projects = **18 database queries** + data processing overhead

### Solution Implemented

#### 1. Created Lightweight `get_project_summary()` Function
Located in: `repository/projects.py`

**Optimizations:**
- ✅ Single project query
- ✅ Count assets instead of fetching all content
- ✅ Fetch only first asset for brief (not all assets)
- ✅ Fetch asset metadata without content (id, name, type, size, addedAt)
- ✅ Skip chapters, characters, callbacks, logs entirely

**Result:** Reduced from 6 queries to **2-3 queries per project**

#### 2. Updated Router Endpoint
Located in: `routers/projects.py`

```python
@router.get("")
def fetch_projects():
    """
    Fetch all projects with lightweight summaries.
    Optimized for list view - doesn't fetch chapters, characters, logs, etc.
    """
    projects = get_all_projects()
    result = []
    for p in projects:
        summary = get_project_summary(p["_id"])
        if summary:
            result.append(summary)
    return result
```

#### 3. Added Database Indexes
Located in: `db/mongo.py`

```python
# Index for sorting projects by creation date (descending)
db.projects.create_index([("createdAt", pymongo.DESCENDING)])

# Compound index for asset queries (projectId + addedAt for sorting)
db.user_assets.create_index([("projectId", pymongo.ASCENDING), ("addedAt", pymongo.ASCENDING)])
```

**To apply indexes, restart the server or run:**
```bash
python -c "from db.mongo import init_db; init_db()"
```

## Performance Improvements

### Before Optimization
- **Time:** 2-4 seconds for 3 projects
- **Queries:** 18+ database queries
- **Data Transfer:** Full chapters, logs, characters, callbacks content

### After Optimization
- **Time:** ~200-500ms for 3 projects (estimated 80-90% reduction)
- **Queries:** 6-9 database queries (3 projects × 2-3 queries each)
- **Data Transfer:** Only essential metadata

## API Response Comparison

### Before (Full Payload)
```json
{
  "id": "project_123",
  "title": "My Book",
  "chapters": [...],        // Full chapter content
  "assets": [...],          // Full asset content
  "memory": {
    "characterBible": [...], // All characters
    "callbackIndex": [...],  // All callbacks
    "decisionLog": [...]     // All logs
  }
}
```

### After (Summary)
```json
{
  "id": "project_123",
  "title": "My Book",
  "subtitle": "...",
  "genre": "...",
  "brief": "...",           // Only first asset content
  "assets": [               // Metadata only (no content)
    {
      "id": "asset_1",
      "name": "file.md",
      "type": "Markdown File",
      "size": "2.5 KB",
      "addedAt": "2024-01-01T00:00:00"
    }
  ],
  "assetCount": 5
}
```

## When to Use Each Endpoint

### `GET /api/projects` (List View - Optimized)
- ✅ Dashboard/list views
- ✅ Quick project browsing
- ✅ Showing project cards with basic info

### `GET /api/projects/{id}` (Detail View - Full Data)
- ✅ Project detail page
- ✅ When you need chapters, characters, logs
- ✅ Full project workspace

## Future Optimization Opportunities

1. **Pagination:** Add `?page=1&limit=10` for large project lists
2. **Caching:** Cache project summaries with Redis/in-memory cache
3. **Aggregation Pipeline:** Use MongoDB aggregation for even faster queries
4. **Lazy Loading:** Load assets/chapters on-demand in the UI
5. **GraphQL:** Consider GraphQL for flexible data fetching

## Monitoring

To measure performance improvements:

```python
import time

start = time.time()
result = fetch_projects()
elapsed = time.time() - start
print(f"Fetched {len(result)} projects in {elapsed:.3f}s")
```

## Related Files
- `server/repository/projects.py` - Data access layer
- `server/routers/projects.py` - API endpoints
- `server/db/mongo.py` - Database initialization
- `client/app/lib/api.ts` - Frontend API client
- `client/app/page.tsx` - Dashboard UI
