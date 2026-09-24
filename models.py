import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Column, String, Text, Float, Integer, DateTime, ForeignKey, Enum, UniqueConstraint
)
from sqlalchemy.orm import relationship

from .database import Base


def gen_id():
    return str(uuid.uuid4())


class ProblemStatus(str, enum.Enum):
    REPORTED = "Reported"
    UNDER_REVIEW = "Under Review"
    ACCEPTED = "Accepted"
    ASSIGNED = "Assigned"
    IN_PROGRESS = "In Progress"
    RESOLVED_PENDING_VERIFICATION = "Resolved (Pending Verification)"
    VERIFIED_CLOSED = "Verified / Closed"
    REJECTED = "Rejected"
    REOPENED = "Reopened"


class Category(str, enum.Enum):
    ROADS = "Roads"
    DRAINAGE = "Drainage"
    WATER = "Water"
    GARBAGE = "Garbage"
    STREETLIGHT = "Streetlight"
    SCHOOL = "Government School"
    HOSPITAL = "Government Hospital"
    ELECTRICITY = "Electricity"
    OTHER = "Other"


# There is no separate "representative" role anymore — any signed-in citizen
# can report, upvote, rate severity, or pledge funding interest. 'officer' and
# 'admin' are the only roles with elevated permissions (funding edits etc.),
# and today they're just a column you set manually in the DB for your demo
# accounts — a real admin UI to grant roles is a later milestone.
class UserRole(str, enum.Enum):
    CITIZEN = "citizen"
    OFFICER = "officer"
    ADMIN = "admin"


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_id)
    firebase_uid = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=True)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.CITIZEN)
    created_at = Column(DateTime, default=datetime.utcnow)


# NOTE ON THE CORE DESIGN DECISION:
# `Problem.current_status` is a convenience column ONLY (fast filtering/sorting).
# The SOURCE OF TRUTH is the ProblemEvent table below, which is append-only.
# Never UPDATE a status directly without also inserting an event row.
class Problem(Base):
    __tablename__ = "problems"

    id = Column(String, primary_key=True, default=gen_id)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    category = Column(Enum(Category), nullable=False)
    area_name = Column(String, nullable=False)  # free text for MVP; becomes FK to Area table later
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    reporter_id = Column(String, ForeignKey("users.id"), nullable=False)

    current_status = Column(Enum(ProblemStatus), nullable=False, default=ProblemStatus.REPORTED)

    # Community-signal columns — denormalized counters kept in sync by the
    # upvote/rate endpoints so list sorting doesn't need a live aggregate query.
    upvote_count = Column(Integer, nullable=False, default=0)
    severity_avg = Column(Float, nullable=False, default=0.0)
    severity_count = Column(Integer, nullable=False, default=0)
    priority_score = Column(Integer, nullable=False, default=0)  # upvotes + severity-weighted

    # Funding TRACKER only — deliberately not a payment collector. See
    # backend/README.md "Funding" section for why real donations route
    # through an external, already-compliant platform instead of this app.
    funding_estimated = Column(Float, nullable=True)
    funding_pledged = Column(Float, nullable=True)
    funding_received = Column(Float, nullable=True)
    funding_link = Column(String, nullable=True)  # external verified platform / UPI page

    created_at = Column(DateTime, default=datetime.utcnow)

    reporter = relationship("User")
    events = relationship("ProblemEvent", back_populates="problem", order_by="ProblemEvent.created_at")
    media = relationship("ProblemMedia", back_populates="problem", order_by="ProblemMedia.created_at")


class ProblemEvent(Base):
    __tablename__ = "problem_events"

    id = Column(String, primary_key=True, default=gen_id)
    problem_id = Column(String, ForeignKey("problems.id"), nullable=False)
    from_status = Column(Enum(ProblemStatus), nullable=True)
    to_status = Column(Enum(ProblemStatus), nullable=False)
    actor_role = Column(String, nullable=False)  # 'citizen' | 'officer' | 'system'
    note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    problem = relationship("Problem", back_populates="events")


class MediaType(str, enum.Enum):
    IMAGE = "image"
    VIDEO = "video"


# MVP storage: files land on local disk under /uploads and are served as static
# files (see app/main.py). Fine for local dev and a demo deploy. Swap `url` to
# point at Cloudinary/Supabase Storage (both have free tiers) once you need
# uploads to survive a redeploy on a free host like Render.
class ProblemMedia(Base):
    __tablename__ = "problem_media"

    id = Column(String, primary_key=True, default=gen_id)
    problem_id = Column(String, ForeignKey("problems.id"), nullable=False)
    url = Column(String, nullable=False)
    media_type = Column(Enum(MediaType), nullable=False)
    caption = Column(String, nullable=True)  # e.g. "Before" / "After repair"
    is_live_capture = Column(String, nullable=True)  # 'true' when taken via in-app camera, not gallery upload
    created_at = Column(DateTime, default=datetime.utcnow)

    problem = relationship("Problem", back_populates="media")


# One upvote per (user, problem) — enforced at the DB level now that we have
# real accounts, closing the "anonymous ballot stuffing" gap from the MVP.
class Upvote(Base):
    __tablename__ = "upvotes"
    __table_args__ = (UniqueConstraint("user_id", "problem_id", name="uq_upvote_user_problem"),)

    id = Column(String, primary_key=True, default=gen_id)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    problem_id = Column(String, ForeignKey("problems.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


# One severity rating per (user, problem); re-rating updates the same row
# rather than creating a second one, so the average can't be gamed by re-voting.
class SeverityRating(Base):
    __tablename__ = "severity_ratings"
    __table_args__ = (UniqueConstraint("user_id", "problem_id", name="uq_rating_user_problem"),)

    id = Column(String, primary_key=True, default=gen_id)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    problem_id = Column(String, ForeignKey("problems.id"), nullable=False)
    stars = Column(Integer, nullable=False)  # 1-5
    created_at = Column(DateTime, default=datetime.utcnow)
