import asyncio
import time

import httpx

BASE = "https://musicbrainz.org/ws/2"
USER_AGENT = "MinidiscMeta/1.0 (https://github.com/chrishuangcf/minidisc-library)"
_last_request = 0.0
_request_lock = asyncio.Lock()


async def _get_json(path: str, params: dict) -> dict:
    global _last_request
    url = f"{BASE}{path}"
    async with _request_lock:
        async with httpx.AsyncClient(headers={"User-Agent": USER_AGENT}, follow_redirects=True) as client:
            for attempt in range(4):
                wait = _last_request + 1.1 - time.monotonic()
                if wait > 0:
                    await asyncio.sleep(wait)
                response = await client.get(url, params=params, timeout=20.0)
                _last_request = time.monotonic()
                print(f"[MUSICBRAINZ] Response status: {response.status_code}")
                print(f"[MUSICBRAINZ] Full URL: {response.url}")
                if response.status_code in (429, 503) and attempt < 3:
                    await asyncio.sleep(1.5 * (attempt + 1))
                    continue
                response.raise_for_status()
                return response.json()
    raise RuntimeError("MusicBrainz request failed")


def _query(artist: str | None, album: str | None, track_count: int | None) -> str:
    terms = []
    if artist:
        terms.append(f'artist:"{artist}"')
    if album:
        terms.append(f'release:"{album}"')
    # Common titles like "Thriller" have hundreds of hits. Narrow by track count when we know it.
    if track_count:
        terms.append(f"tracks:{track_count}")
    return " AND ".join(terms) if terms else "*:*"


_SUBTITLE_RHS = (
    "musical",
    "soundtrack",
    "score",
    "cast",
    "cast recording",
    "live",
    "deluxe",
    "deluxe edition",
    "remaster",
    "remastered",
    "expanded",
    "expanded edition",
    "anniversary",
    "anniversary edition",
    "edition",
    "ep",
    "single",
)


def _rhs_looks_like_artist(right: str) -> bool:
    normalized = right.strip().lower()
    if normalized.startswith("the "):
        normalized = normalized[4:]
    if normalized in _SUBTITLE_RHS:
        return False
    if normalized.startswith("original ") and "cast" in normalized:
        return False
    if normalized.startswith("live "):
        return False
    return True


def _title_parts(album: str | None) -> list[tuple[str | None, str | None]]:
    """Try album alone, then Album - Artist when the right side looks like an artist."""
    if not album:
        return [(None, None)]
    variants: list[tuple[str | None, str | None]] = [(None, album)]
    if " - " not in album:
        return variants
    left, right = [part.strip() for part in album.split(" - ", 1)]
    if left and right and _rhs_looks_like_artist(right):
        variants.append((right, left))  # Album - Artist
        variants.append((left, right))  # Artist - Album
    return variants


async def _search_releases(artist: str | None, album: str | None, track_count: int | None) -> list[dict]:
    query = _query(artist, album, track_count)
    print(f"[MUSICBRAINZ] Query: {query}")
    result = await _get_json("/release", {"query": query, "fmt": "json", "limit": 25})
    releases = result.get("releases", [])
    print(f"[MUSICBRAINZ] Found {len(releases)} releases")
    return releases


async def search_release_by_tracks(
    artist: str | None,
    album: str | None,
    track_count: int | None,
    durations_ms: list[int] | None,
    track_titles: list[str] | None = None,
):
    del durations_ms
    seen: set[str] = set()
    releases: list[dict] = []

    async def collect_query(query: str) -> None:
        print(f"[MUSICBRAINZ] Query: {query}")
        result = await _get_json("/release", {"query": query, "fmt": "json", "limit": 25})
        print(f"[MUSICBRAINZ] Found {len(result.get('releases', []))} releases")
        for release in result.get("releases", []):
            release_id = release.get("id")
            if not release_id or release_id in seen:
                continue
            seen.add(release_id)
            releases.append(release)

    async def collect(next_artist: str | None, next_album: str | None, count: int | None) -> None:
        query = _query(next_artist, next_album, count)
        if query == "*:*":
            return
        await collect_query(query)

    tried: set[tuple[str | None, str | None, int | None]] = set()

    async def try_collect(next_artist: str | None, next_album: str | None, count: int | None) -> None:
        key = (next_artist, next_album, count)
        if key in tried:
            return
        tried.add(key)
        await collect(next_artist, next_album, count)

    # Named tracks disambiguate common album titles ("Thriller") before the noisy title-only search.
    first_title = next((title.strip() for title in (track_titles or []) if title and title.strip()), None)
    if first_title and album:
        normalized = first_title.replace("\u2019", "'").replace("\u2018", "'")
        terms = [f'release:"{album}"', f'recording:"{normalized}"']
        if track_count:
            terms.append(f"tracks:{track_count}")
        if artist:
            terms.insert(0, f'artist:"{artist}"')
        await collect_query(" AND ".join(terms))

    for parsed_artist, parsed_album in _title_parts(album):
        await try_collect(artist or parsed_artist, parsed_album or album, track_count)

    # Track-count filters miss alternate pressings; retry without them, then without artist.
    if not releases and track_count:
        for parsed_artist, parsed_album in _title_parts(album):
            await try_collect(artist or parsed_artist, parsed_album or album, None)
    if not releases and artist:
        for parsed_artist, parsed_album in _title_parts(album):
            await try_collect(None, parsed_album or album, track_count)
            await try_collect(None, parsed_album or album, None)
    return {"releases": releases}


async def recordings_search_by_duration(artist: str | None, title_hint: str | None, duration_ms: int, tol_ms: int = 2000):
    low, high = max(0, duration_ms - tol_ms), duration_ms + tol_ms
    terms = [f"dur:[{low} TO {high}]"]
    if artist:
        terms.append(f'artist:"{artist}"')
    if title_hint:
        terms.append(f'recording:"{title_hint}"')
    return await _get_json("/recording", {"query": " ".join(terms), "fmt": "json"})


async def get_release_by_id(mbid: str):
    print(f"[MUSICBRAINZ] Fetching release: {mbid}")
    return await _get_json(f"/release/{mbid}", {"fmt": "json", "inc": "recordings+artist-credits"})
