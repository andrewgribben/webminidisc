from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, ForeignKey, Text, UniqueConstraint, Index, JSON, DateTime, func, LargeBinary

class Base(DeclarativeBase): 
    pass

class Artist(Base):
    __tablename__ = "artists"
    id: Mapped[int] = mapped_column(primary_key=True)
    mbid: Mapped[str | None] = mapped_column(String(36), index=True, unique=True)
    name: Mapped[str] = mapped_column(String(256), index=True)

class Album(Base):
    __tablename__ = "albums"
    id: Mapped[int] = mapped_column(primary_key=True)
    mbid: Mapped[str | None] = mapped_column(String(36), index=True, unique=True)
    title: Mapped[str] = mapped_column(String(256), index=True)
    artist_id: Mapped[int] = mapped_column(ForeignKey("artists.id"))
    year: Mapped[int | None]
    cover_url: Mapped[str | None]
    cover_data: Mapped[bytes | None] = mapped_column(LargeBinary)
    cover_mime_type: Mapped[str | None] = mapped_column(String(50))
    artist = relationship("Artist")

class Disc(Base):
    __tablename__ = "discs"
    id: Mapped[int] = mapped_column(primary_key=True)
    device_signature: Mapped[str] = mapped_column(String(128), index=True)  # netmd unique-ish signature
    disc_title: Mapped[str | None] = mapped_column(String(256), index=True)
    toc_hash: Mapped[str] = mapped_column(String(64), index=True)  # hash of tracks (count+durations+order)
    source: Mapped[str | None] = mapped_column(String(32), default="minidisc")  # "minidisc", "cd", or "file"
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())
    tracks = relationship("Track", backref="disc", cascade="all, delete-orphan")
    __table_args__ = (UniqueConstraint("device_signature", "toc_hash", name="uq_disc_signature_toc"),)

class Track(Base):
    __tablename__ = "tracks"
    id: Mapped[int] = mapped_column(primary_key=True)
    disc_id: Mapped[int] = mapped_column(ForeignKey("discs.id", ondelete="CASCADE"), index=True)
    index_no: Mapped[int]
    raw_title: Mapped[str | None] = mapped_column(String(256))
    duration_ms: Mapped[int] = mapped_column(Integer)
    artist_id: Mapped[int | None] = mapped_column(ForeignKey("artists.id"))
    album_id: Mapped[int | None] = mapped_column(ForeignKey("albums.id"))
    title: Mapped[str | None] = mapped_column(String(256), index=True)
    ext_meta: Mapped[dict | None] = mapped_column(JSON)
    artist = relationship("Artist")
    album = relationship("Album")

Index("ix_tracks_search", Track.title, Track.duration_ms)
