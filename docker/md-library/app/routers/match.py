"""
Router for disc matching operations
"""
from fastapi import APIRouter, HTTPException
from sqlalchemy import func
from typing import List, Optional
from pydantic import BaseModel

from ..db import SessionLocal
from .. import models as m

router = APIRouter(prefix="/api/match", tags=["match"])


class TrackMatchData(BaseModel):
    """Track data for matching"""
    index_no: int
    title: str
    duration_ms: int


class DiscMatchRequest(BaseModel):
    """Request payload for disc matching"""
    device_signature: str
    disc_title: str
    tracks: List[TrackMatchData]


class DiscMatchResponse(BaseModel):
    """Response for disc matching"""
    matched: bool
    disc_id: Optional[int] = None
    disc_title: Optional[str] = None
    match_score: float = 0.0
    match_method: Optional[str] = None  # 'exact', 'fuzzy', 'none'


@router.post("/disc", response_model=DiscMatchResponse)
def match_disc(request: DiscMatchRequest):
    """
    Match a disc against the database using SQL-based comparison
    
    Matching criteria:
    1. Device signature exact match
    2. Disc title similarity (case-insensitive, partial match)
    3. Track count match
    4. Track title similarity (at least 70% of tracks must match)
    
    Returns:
        DiscMatchResponse with match result and disc_id if found
    """
    
    print(f"\n{'='*60}")
    print(f"🔍 [MATCH SERVICE] Matching disc request received")
    print(f"   Device Signature: {request.device_signature}")
    print(f"   Disc Title: {request.disc_title}")
    print(f"   Track Count: {len(request.tracks)}")
    print(f"{'='*60}")
    
    session = SessionLocal()
    try:
        # Step 1: Try exact device signature match
        disc_by_signature = session.query(m.Disc).filter(
            m.Disc.device_signature == request.device_signature
        ).first()
        
        if disc_by_signature:
            print(f"✅ Exact match found by device signature!")
            print(f"   Disc ID: {disc_by_signature.id}")
            print(f"   Disc Title: {disc_by_signature.disc_title}")
            return DiscMatchResponse(
                matched=True,
                disc_id=disc_by_signature.id,
                disc_title=disc_by_signature.disc_title,
                match_score=1.0,
                match_method='exact'
            )
        
        # Step 2: Find potential matches by track count
        track_count = len(request.tracks)
        
        # Get all discs with same track count
        potential_discs = session.query(m.Disc).join(m.Track).group_by(m.Disc.id).having(
            func.count(m.Track.id) == track_count
        ).all()
        
        print(f"\n📊 Found {len(potential_discs)} disc(s) with {track_count} tracks")
        
        if not potential_discs:
            print("❌ No discs with matching track count found")
            return DiscMatchResponse(matched=False)
        
        # Step 3: For each potential match, calculate similarity score
        best_match = None
        best_score = 0.0
        
        for disc in potential_discs:
            print(f"\n🔎 Evaluating disc ID {disc.id}: '{disc.disc_title}'")
            
            # Check disc title similarity
            disc_title_lower = (disc.disc_title or '').strip().lower()
            request_title_lower = (request.disc_title or '').strip().lower()
            
            title_match = False
            if disc_title_lower and request_title_lower:
                if disc_title_lower == request_title_lower:
                    title_match = True
                    print(f"   ✓ Title exact match")
                elif disc_title_lower in request_title_lower or request_title_lower in disc_title_lower:
                    title_match = True
                    print(f"   ✓ Title partial match")
                else:
                    print(f"   ✗ Title mismatch: '{disc_title_lower}' vs '{request_title_lower}'")
            else:
                print(f"   ⚠ One or both titles empty")
            
            # Get all tracks for this disc
            db_tracks = session.query(m.Track).filter(m.Track.disc_id == disc.id).order_by(m.Track.index_no).all()
        
            # Match tracks by title
            matched_tracks = 0
            meaningful_tracks = 0
            
            for req_track in request.tracks:
                # Find corresponding track in DB by index
                db_track = next((t for t in db_tracks if t.index_no == req_track.index_no), None)
                
                if db_track:
                    req_title = (req_track.title or '').strip().lower()
                    db_title = (db_track.title or db_track.raw_title or '').strip().lower()
                    
                    # Check if request track has meaningful title (not "Track N" or blank)
                    is_meaningful = req_title and not req_track.title.startswith('track ') and req_title != 'unknown'
                    
                    if is_meaningful:
                        meaningful_tracks += 1
                        
                        # Check for fuzzy match
                        if req_title == db_title or req_title in db_title or db_title in req_title:
                            matched_tracks += 1
                            print(f"   ✓ Track {req_track.index_no}: '{req_title}' matches '{db_title}'")
                        else:
                            print(f"   ✗ Track {req_track.index_no}: '{req_title}' != '{db_title}'")
            
            # Calculate match score
            track_match_percentage = 0.0
            if meaningful_tracks > 0:
                track_match_percentage = (matched_tracks / meaningful_tracks) * 100
            
            print(f"   📊 Track Match: {matched_tracks}/{meaningful_tracks} ({track_match_percentage:.1f}%)")
            
            # Determine if this is a good match
            is_match = False
            
            if meaningful_tracks > 0:
                # If we have meaningful track titles, require 70% match
                if track_match_percentage >= 70:
                    is_match = True
                    print(f"   ✅ Match by track titles (≥70%)")
            else:
                # No meaningful track titles - rely on title match
                if title_match:
                    is_match = True
                    print(f"   ✅ Match by disc title (no meaningful track titles)")
            
            if is_match:
                # Calculate overall score (weighted: 30% title, 70% tracks)
                title_score = 1.0 if title_match else 0.5
                track_score = track_match_percentage / 100.0
                
                overall_score = (0.3 * title_score) + (0.7 * track_score)
                
                print(f"   🎯 Overall Score: {overall_score:.2f}")
                
                if overall_score > best_score:
                    best_score = overall_score
                    best_match = disc
                    print(f"   ⭐ New best match!")
        
        # Return best match if found
        if best_match and best_score >= 0.7:
            print(f"\n{'='*60}")
            print(f"✅ [MATCH SERVICE] Best match found!")
            print(f"   Disc ID: {best_match.id}")
            print(f"   Disc Title: {best_match.disc_title}")
            print(f"   Match Score: {best_score:.2f}")
            print(f"{'='*60}\n")
            
            return DiscMatchResponse(
                matched=True,
                disc_id=best_match.id,
                disc_title=best_match.disc_title,
                match_score=best_score,
                match_method='fuzzy'
            )
        else:
            print(f"\n{'='*60}")
            print(f"❌ [MATCH SERVICE] No suitable match found")
            print(f"   Best Score: {best_score:.2f} (required: 0.70)")
            print(f"{'='*60}\n")
            
            return DiscMatchResponse(matched=False, match_score=best_score)
    finally:
        session.close()
