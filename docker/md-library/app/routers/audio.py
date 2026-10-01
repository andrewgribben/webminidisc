import os
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse

from .. import models as m
from ..db import SessionLocal

router = APIRouter(prefix="/api/discs", tags=["audio"])


def audio_root() -> Path:
    root = Path(os.environ.get("AUDIO_DIR", "/data/audio"))
    root.mkdir(parents=True, exist_ok=True)
    return root


def track_path(disc_id: int, index: int) -> Path:
    if index < 0:
        raise HTTPException(status_code=400, detail="Track index must be zero or greater")
    return audio_root() / str(disc_id) / f"{index}.wav"


def require_disc(disc_id: int) -> None:
    session = SessionLocal()
    try:
        disc = session.query(m.Disc).filter(m.Disc.id == disc_id).first()
        if disc is None:
            raise HTTPException(status_code=404, detail="Disc not found")
    finally:
        session.close()


@router.get("/{disc_id}/audio")
def list_audio(disc_id: int) -> dict:
    require_disc(disc_id)
    folder = audio_root() / str(disc_id)
    if not folder.is_dir():
        return {"indexes": []}
    indexes = sorted(int(path.stem) for path in folder.glob("*.wav") if path.stem.isdigit())
    return {"indexes": indexes}


@router.get("/{disc_id}/audio/{index}")
def get_audio(disc_id: int, index: int):
    require_disc(disc_id)
    path = track_path(disc_id, index)
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Audio not found")
    return FileResponse(path, media_type="audio/wav", filename=f"{index}.wav")


@router.post("/{disc_id}/audio/{index}")
async def put_audio(disc_id: int, index: int, request: Request) -> dict:
    require_disc(disc_id)
    body = await request.body()
    if len(body) < 44 or body[:4] != b"RIFF":
        raise HTTPException(status_code=400, detail="Expected a WAV file")
    path = track_path(disc_id, index)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(body)
    return {"disc_id": disc_id, "index": index, "bytes": len(body)}
