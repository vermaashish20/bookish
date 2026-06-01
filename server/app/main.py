"""FastAPI application entrypoint. Run from server/: uvicorn app.main:app --reload"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.infrastructure.database.mongo import init_db


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    from app.infrastructure.vector.embeddings import get_embedding_function
    from app.infrastructure.vector.store import get_client

    get_embedding_function()
    get_client()
    yield


def create_app() -> FastAPI:
    application = FastAPI(
        title="Bookish Agent Orchestrator",
        version="0.1.0",
        lifespan=lifespan,
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    application.include_router(api_router)

    @application.get("/")
    def read_root():
        return {"message": "Bookish orchestrator backend running.", "version": "0.1.0"}

    return application


app = create_app()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
