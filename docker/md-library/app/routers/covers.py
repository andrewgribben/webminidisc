from fastapi import APIRouter, HTTPException, Response

from ..services import coverart

router = APIRouter(prefix="/api/covers", tags=["covers"])


@router.get("/release/{mbid}")
async def get_release_cover(mbid: str):
    """Proxy Cover Art Archive front cover for match-dialog previews (same-origin)."""
    url = await coverart.get_front_cover_url(mbid)
    if not url:
        raise HTTPException(status_code=404, detail="No cover art available")
    fetched = await coverart.fetch_image_bytes(url)
    if not fetched:
        raise HTTPException(status_code=502, detail="Could not download cover art")
    content, mime = fetched
    return Response(content=content, media_type=mime, headers={"Cache-Control": "public, max-age=86400"})
