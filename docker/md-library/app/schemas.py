from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class TrackBase(BaseModel):
    index_no: int
    raw_title: Optional[str] = None
    duration_ms: int

class TrackCreate(TrackBase):
    title: Optional[str] = None
    artist: Optional[str] = None
    album: Optional[str] = None
    artist_mbid: Optional[str] = None
    album_mbid: Optional[str] = None
    cover_url: Optional[str] = None
    year: Optional[int] = None  # Album year for metadata

class Track(TrackBase):
    id: int
    disc_id: int
    artist_id: Optional[int] = None
    album_id: Optional[int] = None
    title: Optional[str] = None
    ext_meta: Optional[dict] = None

    class Config:
        from_attributes = True

class TrackUpdate(BaseModel):
    """Schema for updating track with full metadata"""
    id: int
    title: Optional[str] = None
    artist_name: Optional[str] = None
    album_title: Optional[str] = None
    cover_url: Optional[str] = None

class DiscBase(BaseModel):
    device_signature: str
    disc_title: Optional[str] = None
    source: Optional[str] = "minidisc"  # "minidisc", "cd", or "file"

class DiscCreate(DiscBase):
    tracks: List[TrackCreate]

class Disc(DiscBase):
    id: int
    toc_hash: str
    created_at: datetime
    tracks: List[Track] = []

    class Config:
        from_attributes = True

class ArtistBase(BaseModel):
    name: str
    mbid: Optional[str] = None

class Artist(ArtistBase):
    id: int

    class Config:
        from_attributes = True

class AlbumBase(BaseModel):
    title: str
    mbid: Optional[str] = None
    year: Optional[int] = None
    cover_url: Optional[str] = None

class Album(AlbumBase):
    id: int
    artist_id: int
    artist: Artist
    cover_mime_type: Optional[str] = None

    class Config:
        from_attributes = True

class AlbumCoverUpload(BaseModel):
    """Schema for uploading album cover"""
    cover_url: Optional[str] = None
    cover_data_base64: Optional[str] = None
    cover_mime_type: Optional[str] = None

class ReleaseTrack(BaseModel):
    position: int
    title: str
    duration_ms: Optional[int] = None
    # 1-based index across the whole release, so disc 2 of a 46-track album starts at 24.
    number: Optional[int] = None

class MetadataMatch(BaseModel):
    release_mbid: str
    title: str
    artist_credit: Optional[str] = None
    date: Optional[str] = None
    score: float
    cover_url: Optional[str] = None
    track_count: Optional[int] = None

class MetadataMatchDetailed(MetadataMatch):
    tracks: List[ReleaseTrack] = []

class MatchResponse(BaseModel):
    matches: List[MetadataMatch]

class ReleaseDetailsResponse(BaseModel):
    release_mbid: str
    title: str
    artist_credit: Optional[str] = None
    date: Optional[str] = None
    cover_url: Optional[str] = None
    medium_position: Optional[int] = None
    medium_title: Optional[str] = None
    tracks: List[ReleaseTrack]

class ReleaseAlignRequest(BaseModel):
    tracks: List[dict] = []

class DiscFingerprint(BaseModel):
    disc_title: Optional[str] = None
    artist_hint: Optional[str] = None
    tracks: List[dict]  # [{index_no, raw_title, duration_ms}]

class SaveDiscResponse(BaseModel):
    disc_id: int
