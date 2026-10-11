import httpx
import warnings

# Suppress SSL verification warnings since we're disabling verification for Cover Art Archive API
warnings.filterwarnings('ignore', message='Unverified HTTPS request')

CAA_BASE = "https://coverartarchive.org/release"
USER_AGENT = "MinidiscMeta/1.0 (https://github.com/andrewgribben/webminidisc)"


async def get_front_cover_url(mbid: str) -> str | None:
    try:
        async with httpx.AsyncClient(
            headers={"User-Agent": USER_AGENT},
            follow_redirects=True,
            verify=False,
        ) as client:
            response = await client.get(f"{CAA_BASE}/{mbid}", timeout=20.0)
            if response.status_code in (404, 429, 503):
                return None
            response.raise_for_status()
            payload = response.json()
            for image in payload.get("images", []):
                if image.get("front"):
                    return image.get("thumbnails", {}).get("large") or image.get("image")
    except httpx.HTTPError as error:
        print(f"[COVER] Cover lookup failed for {mbid}: {error}")
        return None
    return None


async def fetch_image_bytes(url: str) -> tuple[bytes, str] | None:
    """Download an image server-side so the browser never hits CAA/archive.org CORS."""
    try:
        async with httpx.AsyncClient(
            headers={"User-Agent": USER_AGENT},
            follow_redirects=True,
            verify=False,
        ) as client:
            response = await client.get(url, timeout=30.0)
            if response.status_code >= 400:
                return None
            mime = response.headers.get("content-type") or "image/jpeg"
            # Drop charset / extra params
            mime = mime.split(";")[0].strip() or "image/jpeg"
            content = response.content
            if not content or len(content) < 32:
                return None
            return content, mime
    except httpx.HTTPError as error:
        print(f"[COVER] Image download failed for {url}: {error}")
        return None


def same_origin_album_cover_path(album_id: int) -> str:
    return f"/api/discs/albums/{album_id}/cover"


def same_origin_release_cover_path(mbid: str) -> str:
    return f"/api/covers/release/{mbid}"
