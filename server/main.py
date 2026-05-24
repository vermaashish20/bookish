from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from db.mongo import init_db
from routers.projects import router as projects_router
from routers.settings import router as settings_router
from routers.messages import router as messages_router

app = FastAPI(title="AIuthor Multi-Agent Book Orchestrator Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()

@app.get("/")
def read_root():
    return {"message": "AIuthor Orchestrator backend running successfully."}

app.include_router(projects_router)
app.include_router(settings_router)
app.include_router(messages_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
