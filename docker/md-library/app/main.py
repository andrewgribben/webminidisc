from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .db import init_db
from .routers import audio, covers, discs, enrich, match

api = FastAPI(title="MiniDisc Metadata Service")

api.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()

api.include_router(discs.router)
api.include_router(audio.router)
api.include_router(covers.router)
api.include_router(enrich.router)
api.include_router(match.router)


@api.get("/healthz")
def healthz():
    return {"ok": True}
