import httpx
import warnings

# Suppress SSL verification warnings since we're disabling verification for Cover Art Archive API
warnings.filterwarnings('ignore', message='Unverified HTTPS request')

CAA_BASE = "https://coverartarchive.org/release"

async def get_front_cover_url(mbid: str) -> str | None:
    try:
        async with httpx.AsyncClient(headers={"User-Agent": "MinidiscMeta/1.0 (https://github.com/chrishuangcf/minidisc-library)"}, follow_redirects=True) as client:
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
