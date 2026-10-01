import re

from fastapi import APIRouter, HTTPException
from rapidfuzz import fuzz
from ..services import musicbrainz as mb, coverart
from ..schemas import DiscFingerprint, MatchResponse, ReleaseAlignRequest, ReleaseDetailsResponse

router = APIRouter(prefix="/api/enrich", tags=["enrich"])

# Right-hand sides that are album subtitles, not "Album - Artist" credits.
_SUBTITLE_RHS = re.compile(
    r"^(the\s+)?"
    r"(musical|soundtrack|score|cast(\s+recording)?|original\s+.+\s+cast|"
    r"live(\s+at\b.*)?|deluxe(\s+edition)?|remaster(ed)?|"
    r"expanded(\s+edition)?|anniversary(\s+edition)?|edition|ep|single)\s*$",
    re.I,
)


def looks_like_album_artist_split(left: str, right: str) -> bool:
    if not left or not right:
        return False
    return _SUBTITLE_RHS.match(right) is None


def recording_title_hint(raw_title: str | None) -> str:
    """Prefer the song name when NetMD titles are stored as 'Artist - Title'."""
    title = (raw_title or "").strip()
    if " - " not in title:
        return title
    _, right = title.rsplit(" - ", 1)
    return right.strip() or title


def normalize_duration_ms(duration_ms: int) -> int:
    # netmd-js reports length in frames (512 frames = 1 second). The page was multiplying that by 1000.
    if duration_ms > 30 * 60 * 1000:
        seconds = (duration_ms / 1000) / 512
        if 1 <= seconds <= 80 * 60:
            return int(seconds * 1000)
    return duration_ms


def flatten_release(release: dict) -> list[dict]:
    """Every track on every disc, in play order, numbered across the whole release."""
    rows = []
    for medium in release.get("media") or []:
        medium_position = medium.get("position")
        medium_title = medium.get("title") or None
        for track in medium.get("tracks") or []:
            rows.append({
                "position": track.get("position") or 0,
                "number": len(rows) + 1,
                "title": track.get("title") or "",
                "duration_ms": track.get("length"),
                "medium_position": medium_position,
                "medium_title": medium_title,
            })
    return rows


def medium_counts(release: dict) -> list[int]:
    counts = []
    for medium in release.get("media") or []:
        count = medium.get("track-count") or len(medium.get("tracks") or [])
        if count:
            counts.append(count)
    return counts


def count_matches_release(release: dict, track_count: int | None) -> bool:
    counts = medium_counts(release)
    if not counts or not track_count:
        return True
    return track_count in counts or track_count == sum(counts)


def window_score(window: list[dict], fp_tracks: list[dict]) -> float:
    differences = []
    title_scores = []
    for index, track in enumerate(fp_tracks):
        length = window[index].get("duration_ms")
        if length:
            differences.append(abs(length - normalize_duration_ms(track["duration_ms"])))
        raw_title = (track.get("raw_title") or "").strip()
        if raw_title:
            title_scores.append(fuzz.token_set_ratio(raw_title, window[index].get("title") or ""))
    if not differences and not title_scores:
        return -1
    score = 0.0
    if differences:
        score += max(0, 100 - (sum(differences) / len(differences) / 1000))
    if title_scores:
        score += sum(title_scores) / len(title_scores)
    return score


def best_window(rows: list[dict], fp_tracks: list[dict] | None) -> list[dict]:
    if not rows or not fp_tracks:
        return rows
    count = len(fp_tracks)
    if count > len(rows):
        return rows
    best_score = -1.0
    best_offset = 0
    for offset in range(0, len(rows) - count + 1):
        score = window_score(rows[offset:offset + count], fp_tracks)
        if score > best_score:
            best_score = score
            best_offset = offset
    if best_score < 0:
        return rows[:count]
    return rows[best_offset:best_offset + count]


def medium_summary(tracks: list[dict]) -> tuple[int | None, str | None]:
    positions = []
    titles = []
    for track in tracks:
        position = track.get("medium_position")
        title = track.get("medium_title")
        if position and position not in positions:
            positions.append(position)
        if title and title not in titles:
            titles.append(title)
    if len(positions) == 1 and len(titles) == 1:
        return positions[0], titles[0]
    if len(positions) == 1:
        return positions[0], titles[0] if titles else f"Disc {positions[0]}"
    return None, None


def artist_credit(release: dict) -> str:
    return ", ".join(
        credit["artist"]["name"] for credit in release.get("artist-credit", []) if credit.get("artist")
    )


def score_release(release: dict, fp: DiscFingerprint, track_count: int | None) -> float:
    score = 0.0
    if fp.tracks and track_count and not count_matches_release(release, track_count):
        return -1
    rows = flatten_release(release)
    if fp.tracks and rows and len(rows) >= len(fp.tracks):
        best = -1.0
        count = len(fp.tracks)
        for offset in range(0, len(rows) - count + 1):
            best = max(best, window_score(rows[offset:offset + count], fp.tracks))
        if best >= 0:
            # Prefer releases MusicBrainz already ranked highly for this query.
            return best + (float(release.get("score") or 0) / 100.0)
    if fp.tracks and track_count:
        reported = release.get("track-count") or sum(medium_counts(release))
        if reported:
            score += max(0, 80 - abs(reported - track_count) * 8)
    if fp.disc_title and release.get("title"):
        # Keep the full disc title so "Back to the Future - The Musical" can match.
        score += fuzz.token_set_ratio(fp.disc_title, release["title"])
    if fp.artist_hint and release.get("artist-credit"):
        score += fuzz.token_set_ratio(fp.artist_hint, artist_credit(release)) * 0.5
    elif fp.disc_title and " - " in fp.disc_title and release.get("artist-credit"):
        left, maybe_artist = [part.strip() for part in fp.disc_title.split(" - ", 1)]
        if looks_like_album_artist_split(left, maybe_artist):
            score += fuzz.token_set_ratio(maybe_artist, artist_credit(release)) * 0.5
    score += float(release.get("score") or 0) / 100.0
    return score


def infer_artist_hint(fp: DiscFingerprint) -> str | None:
    if fp.artist_hint and fp.artist_hint.strip():
        return fp.artist_hint.strip()
    if fp.disc_title and " - " in fp.disc_title:
        left, right = [part.strip() for part in fp.disc_title.split(" - ", 1)]
        # Only treat "Album - Artist" when the right side is not a subtitle like "The Musical".
        if looks_like_album_artist_split(left, right):
            return right
    return None


def prefer_release_key(release: dict) -> tuple:
    """Prefer mainstream CD pressings when search results are otherwise tied."""
    media = release.get("media") or []
    formats = {(medium.get("format") or "").lower() for medium in media}
    country = release.get("country") or ""
    date = release.get("date") or ""
    status = release.get("status") or ""
    preference = 0
    if "cd" in formats:
        preference += 4
    if country in {"US", "GB", "XE", "XW"}:
        preference += 2
    if date[:4].isdigit():
        # Slightly prefer earlier official dates for classic albums.
        preference += max(0, 2020 - int(date[:4])) / 100.0
    if status == "Official":
        preference += 1
    if release.get("barcode"):
        preference += 0.5
    return (-preference, -float(release.get("score") or 0))


@router.post("/match", response_model=MatchResponse)
async def match_meta(fp: DiscFingerprint):
    # Heuristic: use track count + optional disc title to find candidate releases,
    # then align by ordered durations and fuzzy titles when present.
    print(f"[ENRICH] Received match request - artist_hint: {fp.artist_hint}, disc_title: {fp.disc_title}, tracks: {len(fp.tracks) if fp.tracks else 0}")

    track_count = len(fp.tracks) if fp.tracks else None
    artist_hint = infer_artist_hint(fp)
    # Search the full disc title. Splitting on " - " breaks titles like
    # "Back to the Future - The Musical" into a fake artist "The Musical".
    album_hint = fp.disc_title
    durations_ms = [normalize_duration_ms(t["duration_ms"]) for t in fp.tracks] if fp.tracks else None
    track_titles = [recording_title_hint(t.get("raw_title")) for t in fp.tracks] if fp.tracks else None

    print(f"[ENRICH] Searching MusicBrainz - artist: {artist_hint}, album: {album_hint}, track_count: {track_count}")
    rels = await mb.search_release_by_tracks(artist_hint, album_hint, track_count, durations_ms, track_titles)
    print(f"[ENRICH] Found {len(rels.get('releases', []))} releases from MusicBrainz")

    ordered = sorted(rels.get("releases", []), key=prefer_release_key)

    # Search hits usually lack track lists. Fetch a few details so durations/titles can rank them.
    detailed: list[dict] = []
    for rel in ordered:
        if len(detailed) >= 8:
            break
        if score_release(rel, fp, track_count) < 0:
            continue
        try:
            full = await mb.get_release_by_id(rel["id"])
            full["score"] = rel.get("score")
            detailed.append(full)
        except Exception as exc:
            print(f"[ENRICH] Skipping release detail {rel.get('id')}: {exc}")
            detailed.append(rel)

    candidates = []
    for rel in detailed or ordered:
        score = score_release(rel, fp, track_count)
        if score < 0:
            continue
        # Tiny sticky preference so classic CD pressings win near-ties.
        score += -prefer_release_key(rel)[0]
        candidates.append({"release": rel, "score": score})

    print(f"[ENRICH] Created {len(candidates)} candidates from {len(rels.get('releases', []))} releases")

    if not candidates:
        return {"matches": []}

    # sort + attach cover art - return top 10 for manual search, top 5 for auto-match
    limit = 10 if (not fp.tracks or len(fp.tracks) == 0) else 5
    print(f"[ENRICH] Returning top {limit} matches")
    top = sorted(candidates, key=lambda c: c["score"], reverse=True)[:limit]
    out = []
    for c in top:
        mbid = c["release"]["id"]
        cover = await coverart.get_front_cover_url(mbid)
        
        # Get track count - MusicBrainz search results use "track-count" field
        # If that's not available, try to sum from media tracks
        release_track_count = c["release"].get("track-count")
        if not release_track_count and c["release"].get("media"):
            release_track_count = sum(
                media.get("track-count") or len(media.get("tracks", [])) for media in c["release"]["media"]
            )
        
        out.append({
            "release_mbid": mbid,
            "title": c["release"]["title"],
            "artist_credit": ", ".join(a["artist"]["name"] for a in c["release"].get("artist-credit", [])) if c["release"].get("artist-credit") else None,
            "date": c["release"].get("date"),
            "score": round(c["score"], 1),
            "cover_url": cover,
            "track_count": release_track_count
        })
    return {"matches": out}

@router.get("/release/{mbid}", response_model=ReleaseDetailsResponse)
async def get_release_details(mbid: str):
    """Fetch detailed information about a specific release including tracks."""
    print(f"[ENRICH] Fetching release details for MBID: {mbid}")
    
    try:
        release_data = await mb.get_release_by_id(mbid)
        
        if not release_data:
            raise HTTPException(status_code=404, detail="Release not found")
        
        return await release_payload(mbid, release_data, None)
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ENRICH] Error fetching release details: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching release details: {str(e)}")


@router.post("/release/{mbid}", response_model=ReleaseDetailsResponse)
async def align_release_details(mbid: str, body: ReleaseAlignRequest):
    """Return the disc inside this release that matches the MiniDisc track list."""
    try:
        release_data = await mb.get_release_by_id(mbid)
        if not release_data:
            raise HTTPException(status_code=404, detail="Release not found")
        return await release_payload(mbid, release_data, body.tracks)
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ENRICH] Error aligning release details: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching release details: {str(e)}")


async def release_payload(mbid: str, release_data: dict, fp_tracks: list | None):
    selected = best_window(flatten_release(release_data), fp_tracks)
    medium_position, medium_title = medium_summary(selected)
    cover = await coverart.get_front_cover_url(mbid)
    return {
        "release_mbid": mbid,
        "title": release_data.get("title", ""),
        "artist_credit": ", ".join(a["artist"]["name"] for a in release_data.get("artist-credit", [])) if release_data.get("artist-credit") else None,
        "date": release_data.get("date"),
        "cover_url": cover,
        "medium_position": medium_position,
        "medium_title": medium_title,
        "tracks": [
            {
                "position": track["position"],
                "number": track["number"],
                "title": track["title"],
                "duration_ms": track["duration_ms"],
            }
            for track in selected
        ],
    }
