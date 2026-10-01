from fastapi import APIRouter, HTTPException, Response
from ..db import SessionLocal
from .. import models as m
from ..schemas import DiscCreate, SaveDiscResponse, Disc as DiscSchema, Track as TrackSchema, TrackUpdate, AlbumCoverUpload
import hashlib
import json
import base64
from typing import List, Optional, Dict, Any, Tuple

router = APIRouter(prefix="/api/discs", tags=["discs"])

def _process_cover_data(cover_url: Optional[str]) -> Tuple[Optional[str], Optional[bytes], Optional[str]]:
    """
    Process cover data and determine if it's a URL or base64 string.
    Returns tuple of (url, blob_data, mime_type)
    """
    if not cover_url:
        return None, None, None
    
    # Check if it's a base64 data URI (e.g., "data:image/jpeg;base64,...")
    if cover_url.startswith("data:"):
        try:
            # Parse data URI format: data:[<mediatype>][;base64],<data>
            header, encoded = cover_url.split(",", 1)
            mime_type = "image/jpeg"  # default
            
            if ";" in header:
                mime_part = header.split(";")[0].replace("data:", "")
                if mime_part:
                    mime_type = mime_part
            
            # Decode base64 data
            cover_bytes = base64.b64decode(encoded)
            return None, cover_bytes, mime_type
        except Exception as e:
            print(f"[WARNING] Failed to decode base64 data URI: {str(e)}")
            return None, None, None
    
    # Check if it's a raw base64 string (not a data URI)
    # Try to decode - if it fails, assume it's a URL
    try:
        # Base64 strings should only contain alphanumeric chars, +, /, and =
        # If it looks like a URL (contains :// or starts with http), treat as URL
        if "://" in cover_url or cover_url.startswith("http"):
            return cover_url, None, None
        
        # Try to decode as base64
        cover_bytes = base64.b64decode(cover_url, validate=True)
        # If successful and produces reasonable data, treat as base64
        if len(cover_bytes) > 100:  # Reasonable minimum for an image
            return None, cover_bytes, "image/jpeg"
        else:
            # Too small to be an image, probably a URL
            return cover_url, None, None
    except Exception:
        # Decoding failed, treat as URL
        return cover_url, None, None

@router.post("", response_model=SaveDiscResponse)
def save_disc(payload: DiscCreate):
    print(f"[DEBUG] Saving disc: {payload.disc_title}")
    print(f"[DEBUG] Number of tracks in payload: {len(payload.tracks)}")
    
    # Validate that disc has tracks
    if not payload.tracks or len(payload.tracks) == 0:
        print("[DEBUG] Raising HTTPException for empty tracks")
        raise HTTPException(status_code=400, detail="Cannot save disc without tracks")
    
    print("[DEBUG] Validation passed, creating session")
    session = SessionLocal()
    try:
        # compute TOC hash
        toc_sig = hashlib.sha256(json.dumps([(t.index_no, t.duration_ms) for t in payload.tracks]).encode()).hexdigest()
        
        # Check if disc already exists
        existing_disc = session.query(m.Disc).filter(
            m.Disc.device_signature == payload.device_signature,
            m.Disc.toc_hash == toc_sig
        ).first()
        
        if existing_disc:
            # Disc already exists, UPDATE it with new metadata
            print(f"[DEBUG] Disc already exists with ID: {existing_disc.id}, updating metadata...")
            disc = existing_disc
            
            # Update disc title if provided
            if payload.disc_title:
                disc.disc_title = payload.disc_title
                print(f"[DEBUG] Updated disc title to: {payload.disc_title}")
            
            # Delete existing tracks to replace with new metadata
            session.query(m.Track).filter(m.Track.disc_id == disc.id).delete()
            print(f"[DEBUG] Deleted old tracks for disc {disc.id}")
            session.flush()
        else:
            # Create new disc
            disc = m.Disc(
                device_signature=payload.device_signature, 
                disc_title=payload.disc_title, 
                toc_hash=toc_sig,
                source=payload.source or "minidisc"
            )
            session.add(disc)
            session.flush()
            print(f"[DEBUG] Disc created with ID: {disc.id}")

        artist_cache = {}
        album_cache = {}
        tracks_created = 0
        
        print(f"[DEBUG] Starting to process {len(payload.tracks)} tracks...")
        for idx, t in enumerate(payload.tracks):
            print(f"[DEBUG] Processing track {idx + 1}/{len(payload.tracks)}: {t.title}")
            print(f"[DEBUG]   - index_no: {t.index_no}, duration_ms: {t.duration_ms}")
            print(f"[DEBUG]   - artist: {t.artist}, album: {t.album}")
            print(f"[DEBUG]   - cover_url: {t.cover_url[:50] if t.cover_url else 'None'}...")
            a_id = None
            if t.artist:
                key = (t.artist_mbid, t.artist)
                if key not in artist_cache:
                    # Check if artist already exists
                    existing_artist = None
                    if t.artist_mbid:
                        existing_artist = session.query(m.Artist).filter(m.Artist.mbid == t.artist_mbid).first()
                    if not existing_artist:
                        existing_artist = session.query(m.Artist).filter(m.Artist.name == t.artist).first()
                    
                    if existing_artist:
                        artist_cache[key] = existing_artist.id
                        print(f"[DEBUG] Using existing artist: {existing_artist.name} (ID: {existing_artist.id})")
                    else:
                        artist = m.Artist(mbid=t.artist_mbid, name=t.artist)
                        session.add(artist)
                        session.flush()
                        artist_cache[key] = artist.id
                        print(f"[DEBUG] Created artist: {artist.name} (ID: {artist.id})")
                a_id = artist_cache[key]
                
            alb_id = None
            if t.album:
                key = (t.album_mbid, t.album)
                if key not in album_cache:
                    # Check if album already exists
                    existing_album = None
                    if t.album_mbid:
                        existing_album = session.query(m.Album).filter(m.Album.mbid == t.album_mbid).first()
                    
                    if existing_album:
                        # Update album metadata if new data is provided
                        updated = False
                        if t.cover_url and not existing_album.cover_url and not existing_album.cover_data:
                            # Process cover data to determine if it's URL or base64
                            cover_url, cover_blob, cover_mime = _process_cover_data(t.cover_url)
                            if cover_url:
                                existing_album.cover_url = cover_url
                                updated = True
                                print(f"[DEBUG] Set cover_url for existing album")
                            elif cover_blob:
                                existing_album.cover_data = cover_blob
                                existing_album.cover_mime_type = cover_mime
                                existing_album.cover_url = None
                                updated = True
                                print(f"[DEBUG] Set cover_data (blob) for existing album, size: {len(cover_blob)} bytes")
                        if t.year and not existing_album.year:
                            existing_album.year = t.year
                            updated = True
                        if updated:
                            print(f"[DEBUG] Updated metadata for existing album: {existing_album.title}")
                        album_cache[key] = existing_album.id
                        print(f"[DEBUG] Using existing album: {existing_album.title} (ID: {existing_album.id})")
                    else:
                        # If no artist_id, create or get "Unknown Artist"
                        if a_id is None:
                            unknown_artist_key = (None, "Unknown Artist")
                            if unknown_artist_key not in artist_cache:
                                unknown_artist = session.query(m.Artist).filter(m.Artist.name == "Unknown Artist").first()
                                if not unknown_artist:
                                    unknown_artist = m.Artist(mbid=None, name="Unknown Artist")
                                    session.add(unknown_artist)
                                    session.flush()
                                    print(f"[DEBUG] Created 'Unknown Artist' (ID: {unknown_artist.id})")
                                artist_cache[unknown_artist_key] = unknown_artist.id
                            a_id = artist_cache[unknown_artist_key]
                            print(f"[DEBUG] Using 'Unknown Artist' for album without artist")
                        
                        # Process cover data to determine if it's URL or base64
                        cover_url, cover_blob, cover_mime = _process_cover_data(t.cover_url)
                        
                        album = m.Album(
                            mbid=t.album_mbid, 
                            title=t.album, 
                            artist_id=a_id, 
                            cover_url=cover_url,
                            cover_data=cover_blob,
                            cover_mime_type=cover_mime,
                            year=t.year
                        )
                        session.add(album)
                        session.flush()
                        album_cache[key] = album.id
                        if cover_blob:
                            print(f"[DEBUG] Created album: {album.title} (ID: {album.id}) year: {t.year}, cover_data: {len(cover_blob)} bytes")
                        else:
                            print(f"[DEBUG] Created album: {album.title} (ID: {album.id}) year: {t.year}, cover_url: {cover_url}")
                alb_id = album_cache[key]
                
            track = m.Track(
                disc_id=disc.id,
                index_no=t.index_no,
                raw_title=t.raw_title,
                duration_ms=t.duration_ms,
                artist_id=a_id,
                album_id=alb_id,
                title=t.title,
                ext_meta={}
            )
            session.add(track)
            tracks_created += 1
            print(f"[DEBUG] Added track {t.index_no}: {t.title} (raw: {t.raw_title})")
            
        session.commit()
        if existing_disc:
            print(f"[DEBUG] Successfully UPDATED disc ID: {disc.id} with {tracks_created} tracks")
        else:
            print(f"[DEBUG] Successfully CREATED disc ID: {disc.id} with {tracks_created} tracks")
        session.close()
        return SaveDiscResponse(disc_id=disc.id)
        
    except Exception as e:
        print(f"[ERROR] Failed to save disc: {str(e)}")
        import traceback
        traceback.print_exc()
        session.rollback()
        session.close()
        raise HTTPException(status_code=500, detail=f"Failed to save disc: {str(e)}")

@router.get("", response_model=List[DiscSchema])
def get_all_discs():
    """Get all saved discs with their tracks"""
    session = SessionLocal()
    discs = session.query(m.Disc).order_by(m.Disc.created_at.desc()).all()
    return discs

@router.get("/library/cards")
def get_album_library_cards() -> List[Dict[str, Any]]:
    """Get all discs formatted as album cards for the library view"""
    session = SessionLocal()
    discs = session.query(m.Disc).order_by(m.Disc.created_at.desc()).all()
    
    album_cards = []
    for disc in discs:
        # Get tracks with their album and artist info
        tracks = disc.tracks
        
        # Extract artist and cover_url from tracks
        artist_name = None
        cover_url = None
        total_duration_ms = 0
        
        for track in tracks:
            total_duration_ms += track.duration_ms or 0
            
            # Get artist name from first track with artist
            if not artist_name and track.artist_id:
                artist = session.query(m.Artist).filter(m.Artist.id == track.artist_id).first()
                if artist:
                    artist_name = artist.name
            
            # Get cover_url from first track with album
            if not cover_url and track.album_id:
                album = session.query(m.Album).filter(m.Album.id == track.album_id).first()
                if album:
                    if album.cover_url:
                        cover_url = album.cover_url
                    elif album.cover_data:
                        # If we have blob data but no URL, return the API endpoint
                        cover_url = f"/api/discs/albums/{album.id}/cover"
        
        album_cards.append({
            "disc_id": disc.id,
            "disc_title": disc.disc_title or "Untitled Album",
            "artist": artist_name,
            "cover_url": cover_url,
            "track_count": len(tracks),
            "total_duration_ms": total_duration_ms,
            "created_at": str(disc.created_at) if disc.created_at else None,
            "source": disc.source or "minidisc"
        })
    
    session.close()
    return album_cards

@router.get("/{disc_id}", response_model=DiscSchema)
def get_disc(disc_id: int):
    """Get a specific disc with its tracks"""
    session = SessionLocal()
    disc = session.query(m.Disc).filter(m.Disc.id == disc_id).first()
    if not disc:
        raise HTTPException(status_code=404, detail="Disc not found")
    return disc

@router.get("/{disc_id}/detailed")
def get_disc_detailed(disc_id: int) -> Dict[str, Any]:
    """Get a specific disc with full details including artist and album info"""
    session = SessionLocal()
    disc = session.query(m.Disc).filter(m.Disc.id == disc_id).first()
    if not disc:
        raise HTTPException(status_code=404, detail="Disc not found")
    
    # Get tracks with artist and album details
    tracks_detailed = []
    for track in disc.tracks:
        artist_info = None
        album_info = None
        
        if track.artist_id:
            artist = session.query(m.Artist).filter(m.Artist.id == track.artist_id).first()
            if artist:
                artist_info = {"id": artist.id, "name": artist.name, "mbid": artist.mbid}
        
        if track.album_id:
            album = session.query(m.Album).filter(m.Album.id == track.album_id).first()
            if album:
                # Determine cover URL: use actual URL or generate endpoint reference for blob
                cover_url = album.cover_url
                if not cover_url and album.cover_data:
                    # If we have blob data but no URL, return the API endpoint
                    cover_url = f"/api/discs/albums/{album.id}/cover"
                
                album_info = {
                    "id": album.id, 
                    "title": album.title, 
                    "mbid": album.mbid,
                    "cover_url": cover_url,
                    "year": album.year
                }
        
        tracks_detailed.append({
            "id": track.id,
            "disc_id": track.disc_id,
            "index_no": track.index_no,
            "title": track.title,
            "raw_title": track.raw_title,
            "duration_ms": track.duration_ms,
            "artist": artist_info,
            "album": album_info,
            "ext_meta": track.ext_meta
        })
    
    return {
        "id": disc.id,
        "device_signature": disc.device_signature,
        "disc_title": disc.disc_title,
        "toc_hash": disc.toc_hash,
        "created_at": disc.created_at,
        "tracks": tracks_detailed
    }

@router.put("/{disc_id}/tracks")
def update_disc_tracks(disc_id: int, tracks: List[TrackSchema]):
    """Update track metadata for a disc"""
    session = SessionLocal()
    disc = session.query(m.Disc).filter(m.Disc.id == disc_id).first()
    if not disc:
        raise HTTPException(status_code=404, detail="Disc not found")
    
    # Update existing tracks
    for track_data in tracks:
        track = session.query(m.Track).filter(
            m.Track.disc_id == disc_id, 
            m.Track.id == track_data.id
        ).first()
        if track:
            track.title = track_data.title
            track.raw_title = track_data.raw_title
    
    session.commit()
    return {"status": "updated", "disc_id": disc_id}

@router.put("/{disc_id}")
def update_disc(disc_id: int, disc_title: Optional[str] = None):
    """Update disc title"""
    session = SessionLocal()
    disc = session.query(m.Disc).filter(m.Disc.id == disc_id).first()
    if not disc:
        raise HTTPException(status_code=404, detail="Disc not found")
    
    if disc_title is not None:
        disc.disc_title = disc_title
    
    session.commit()
    session.close()
    return {"status": "updated", "disc_id": disc_id}

@router.put("/{disc_id}/tracks/full")
def update_disc_tracks_full(disc_id: int, tracks: List[TrackUpdate]):
    """Update tracks with full metadata including artist and album info"""
    session = SessionLocal()
    disc = session.query(m.Disc).filter(m.Disc.id == disc_id).first()
    if not disc:
        raise HTTPException(status_code=404, detail="Disc not found")
    
    artist_cache = {}
    album_cache = {}
    
    for track_data in tracks:
        track = session.query(m.Track).filter(
            m.Track.disc_id == disc_id, 
            m.Track.id == track_data.id
        ).first()
        
        if not track:
            continue
        
        # Update track title
        if track_data.title is not None:
            track.title = track_data.title
        
        # Update or create artist
        artist_id = None
        if track_data.artist_name:
            key = track_data.artist_name
            if key not in artist_cache:
                artist = session.query(m.Artist).filter(m.Artist.name == track_data.artist_name).first()
                if not artist:
                    artist = m.Artist(name=track_data.artist_name, mbid=None)
                    session.add(artist)
                    session.flush()
                artist_cache[key] = artist.id
            artist_id = artist_cache[key]
            track.artist_id = artist_id
        
        # Update or create album
        album_id = None
        if track_data.album_title:
            key = (track_data.album_title, artist_id)
            if key not in album_cache:
                album = session.query(m.Album).filter(
                    m.Album.title == track_data.album_title,
                    m.Album.artist_id == artist_id
                ).first()
                if not album:
                    # Process cover data to determine if it's URL or base64
                    cover_url, cover_blob, cover_mime = _process_cover_data(track_data.cover_url)
                    album = m.Album(
                        title=track_data.album_title, 
                        artist_id=artist_id,
                        mbid=None,
                        cover_url=cover_url,
                        cover_data=cover_blob,
                        cover_mime_type=cover_mime
                    )
                    session.add(album)
                    session.flush()
                elif track_data.cover_url:
                    # Update cover if provided (even if album already has one)
                    cover_url, cover_blob, cover_mime = _process_cover_data(track_data.cover_url)
                    if cover_url:
                        album.cover_url = cover_url
                        album.cover_data = None
                        album.cover_mime_type = None
                    elif cover_blob:
                        album.cover_data = cover_blob
                        album.cover_mime_type = cover_mime
                        album.cover_url = None
                album_cache[key] = album.id
            album_id = album_cache[key]
            track.album_id = album_id
    
    session.commit()
    session.close()
    return {"status": "updated", "disc_id": disc_id}

@router.delete("/{disc_id}")
def delete_disc(disc_id: int):
    """Delete a disc and all its tracks"""
    session = SessionLocal()
    disc = session.query(m.Disc).filter(m.Disc.id == disc_id).first()
    if not disc:
        raise HTTPException(status_code=404, detail="Disc not found")
    
    # Delete tracks first (should cascade automatically, but being explicit)
    session.query(m.Track).filter(m.Track.disc_id == disc_id).delete()
    
    # Delete the disc
    session.delete(disc)
    session.commit()
    session.close()
    
    return {"status": "deleted", "disc_id": disc_id}

@router.put("/{disc_id}/cover")
def update_album_cover(disc_id: int, cover_data: AlbumCoverUpload):
    """Update album cover for all tracks in a disc (URL or blob)"""
    session = SessionLocal()
    
    # Get the disc
    disc = session.query(m.Disc).filter(m.Disc.id == disc_id).first()
    if not disc:
        raise HTTPException(status_code=404, detail="Disc not found")
    
    # Get the first track to find the album
    first_track = session.query(m.Track).filter(m.Track.disc_id == disc_id).order_by(m.Track.index_no).first()
    if not first_track or not first_track.album_id:
        raise HTTPException(status_code=404, detail="No album found for this disc")
    
    album = session.query(m.Album).filter(m.Album.id == first_track.album_id).first()
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")
    
    # Update cover_url if provided
    if cover_data.cover_url:
        album.cover_url = cover_data.cover_url
        album.cover_data = None  # Clear blob if URL is provided
        album.cover_mime_type = None
    
    # Update cover_data (blob) if provided
    if cover_data.cover_data_base64:
        try:
            cover_bytes = base64.b64decode(cover_data.cover_data_base64)
            album.cover_data = cover_bytes
            album.cover_mime_type = cover_data.cover_mime_type or "image/jpeg"
            album.cover_url = None  # Clear URL if blob is provided
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid base64 data: {str(e)}")
    
    session.commit()
    session.close()
    
    return {
        "status": "updated",
        "album_id": album.id,
        "has_url": album.cover_url is not None,
        "has_blob": album.cover_data is not None
    }

@router.get("/albums/{album_id}/cover")
def get_album_cover(album_id: int):
    """Get album cover image (returns blob if available, otherwise redirects to URL)"""
    session = SessionLocal()
    album = session.query(m.Album).filter(m.Album.id == album_id).first()
    
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")
    
    # Return blob if available
    if album.cover_data:
        mime_type = album.cover_mime_type or "image/jpeg"
        return Response(content=album.cover_data, media_type=mime_type)
    
    # Return URL if available
    if album.cover_url:
        return {"cover_url": album.cover_url}
    
    raise HTTPException(status_code=404, detail="No cover art available")
