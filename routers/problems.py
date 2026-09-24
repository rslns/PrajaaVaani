import os
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth import get_current_user, get_optional_user
from ..database import get_db

router = APIRouter(prefix="/problems", tags=["problems"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm", "video/quicktime"}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB — generous for a phone photo/short clip

# Which status can legally move to which — this is the enforcement point for your
# "no problem can silently skip steps or be closed by fiat" rule. Extend this table
# (not scattered if/else) when the real escalation engine is added later.
ALLOWED_TRANSITIONS = {
    models.ProblemStatus.REPORTED: {models.ProblemStatus.UNDER_REVIEW, models.ProblemStatus.REJECTED},
    models.ProblemStatus.UNDER_REVIEW: {models.ProblemStatus.ACCEPTED, models.ProblemStatus.REJECTED},
    models.ProblemStatus.ACCEPTED: {models.ProblemStatus.ASSIGNED},
    models.ProblemStatus.ASSIGNED: {models.ProblemStatus.IN_PROGRESS},
    models.ProblemStatus.IN_PROGRESS: {models.ProblemStatus.RESOLVED_PENDING_VERIFICATION},
    models.ProblemStatus.RESOLVED_PENDING_VERIFICATION: {
        models.ProblemStatus.VERIFIED_CLOSED,
        models.ProblemStatus.REOPENED,
    },
    models.ProblemStatus.REOPENED: {models.ProblemStatus.ASSIGNED, models.ProblemStatus.IN_PROGRESS},
}


def _recompute_priority(problem: models.Problem) -> None:
    """Upvotes + a severity-weighted term. Simple and explainable on purpose —
    swap for something fancier later, but keep it a pure function of stored
    counters so it's always cheap to recompute after any single interaction."""
    problem.priority_score = problem.upvote_count + round(problem.severity_avg * problem.severity_count)


@router.post("", response_model=schemas.ProblemDetailOut)
def create_problem(
    payload: schemas.ProblemCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    problem = models.Problem(**payload.model_dump(), reporter_id=current_user.id)
    db.add(problem)
    db.flush()  # get problem.id before inserting the event

    first_event = models.ProblemEvent(
        problem_id=problem.id,
        from_status=None,
        to_status=models.ProblemStatus.REPORTED,
        actor_role="citizen",
        note="Problem reported.",
    )
    db.add(first_event)
    db.commit()
    db.refresh(problem)
    return _with_viewer(problem, current_user, db)


@router.get("", response_model=List[schemas.ProblemOut])
def list_problems(
    status: Optional[models.ProblemStatus] = None,
    category: Optional[models.Category] = None,
    db: Session = Depends(get_db),
):
    query = db.query(models.Problem)
    if status:
        query = query.filter(models.Problem.current_status == status)
    if category:
        query = query.filter(models.Problem.category == category)
    return query.order_by(models.Problem.priority_score.desc(), models.Problem.created_at.desc()).all()


def _with_viewer(problem: models.Problem, user: Optional[models.User], db: Session) -> models.Problem:
    """Attaches a transient `viewer` attribute (not persisted) so the response
    schema can tell the frontend whether *this* signed-in visitor already
    upvoted/rated — without storing that on the Problem row itself."""
    viewer = schemas.ViewerInfo()
    if user:
        upvoted = (
            db.query(models.Upvote)
            .filter(models.Upvote.problem_id == problem.id, models.Upvote.user_id == user.id)
            .first()
        )
        rating = (
            db.query(models.SeverityRating)
            .filter(models.SeverityRating.problem_id == problem.id, models.SeverityRating.user_id == user.id)
            .first()
        )
        viewer.has_upvoted = upvoted is not None
        viewer.my_rating = rating.stars if rating else None
    problem.viewer = viewer  # type: ignore[attr-defined]
    return problem


@router.get("/{problem_id}", response_model=schemas.ProblemDetailOut)
def get_problem(
    problem_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_optional_user),
):
    problem = db.query(models.Problem).filter(models.Problem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    return _with_viewer(problem, current_user, db)


@router.patch("/{problem_id}/status", response_model=schemas.ProblemDetailOut)
def update_status(
    problem_id: str,
    payload: schemas.StatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # NOTE: this only requires *someone* to be logged in — it does not yet check
    # that current_user is actually the officer responsible at this authority
    # level. That role-scoped check is a real-auth-model milestone, not this pass.
    problem = db.query(models.Problem).filter(models.Problem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")

    allowed = ALLOWED_TRANSITIONS.get(problem.current_status, set())
    if payload.to_status not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot move from '{problem.current_status.value}' to '{payload.to_status.value}'. "
            f"Allowed next steps: {[s.value for s in allowed]}",
        )

    event = models.ProblemEvent(
        problem_id=problem.id,
        from_status=problem.current_status,
        to_status=payload.to_status,
        actor_role=payload.actor_role,
        note=payload.note,
    )
    problem.current_status = payload.to_status
    db.add(event)
    db.commit()
    db.refresh(problem)
    return _with_viewer(problem, current_user, db)


@router.post("/{problem_id}/media", response_model=schemas.ProblemMediaOut)
async def upload_media(
    problem_id: str,
    file: UploadFile = File(...),
    caption: Optional[str] = Form(None),
    live: Optional[bool] = Form(False),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    problem = db.query(models.Problem).filter(models.Problem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")

    if file.content_type in ALLOWED_IMAGE_TYPES:
        media_type = models.MediaType.IMAGE
    elif file.content_type in ALLOWED_VIDEO_TYPES:
        media_type = models.MediaType.VIDEO
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.content_type}")

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 20MB).")

    ext = os.path.splitext(file.filename or "")[1]
    filename = f"{uuid.uuid4()}{ext}"
    with open(os.path.join(UPLOAD_DIR, filename), "wb") as f:
        f.write(contents)

    media = models.ProblemMedia(
        problem_id=problem.id,
        url=f"/uploads/{filename}",
        media_type=media_type,
        caption=caption,
        is_live_capture="true" if live else None,
    )
    db.add(media)
    db.commit()
    db.refresh(media)
    return media


@router.post("/{problem_id}/upvote", response_model=schemas.ProblemDetailOut)
def toggle_upvote(
    problem_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    problem = db.query(models.Problem).filter(models.Problem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")

    existing = (
        db.query(models.Upvote)
        .filter(models.Upvote.problem_id == problem_id, models.Upvote.user_id == current_user.id)
        .first()
    )
    if existing:
        db.delete(existing)
        problem.upvote_count = max(0, problem.upvote_count - 1)
    else:
        db.add(models.Upvote(problem_id=problem_id, user_id=current_user.id))
        problem.upvote_count += 1

    _recompute_priority(problem)
    db.commit()
    db.refresh(problem)
    return _with_viewer(problem, current_user, db)


@router.post("/{problem_id}/rate", response_model=schemas.ProblemDetailOut)
def rate_severity(
    problem_id: str,
    payload: schemas.RatingIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    problem = db.query(models.Problem).filter(models.Problem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")

    existing = (
        db.query(models.SeverityRating)
        .filter(models.SeverityRating.problem_id == problem_id, models.SeverityRating.user_id == current_user.id)
        .first()
    )
    if existing:
        existing.stars = payload.stars
    else:
        db.add(models.SeverityRating(problem_id=problem_id, user_id=current_user.id, stars=payload.stars))
        problem.severity_count += 1

    db.flush()
    total_stars = (
        db.query(models.SeverityRating).filter(models.SeverityRating.problem_id == problem_id).all()
    )
    problem.severity_avg = sum(r.stars for r in total_stars) / len(total_stars) if total_stars else 0.0
    _recompute_priority(problem)
    db.commit()
    db.refresh(problem)
    return _with_viewer(problem, current_user, db)


@router.patch("/{problem_id}/funding", response_model=schemas.ProblemDetailOut)
def update_funding(
    problem_id: str,
    payload: schemas.FundingUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role not in (models.UserRole.OFFICER, models.UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Only an officer or admin can update funding info")

    problem = db.query(models.Problem).filter(models.Problem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(problem, field, value)

    db.commit()
    db.refresh(problem)
    return _with_viewer(problem, current_user, db)
