import os

import firebase_admin
from fastapi import Depends, HTTPException, Header
from firebase_admin import auth as firebase_auth, credentials
from sqlalchemy.orm import Session

from . import models
from .database import get_db

# Free to run: Firebase Authentication's free tier covers email/password,
# Google sign-in, and phone OTP with no card required. This backend never
# handles passwords itself — it only verifies the token Firebase already issued.
_SERVICE_ACCOUNT_PATH = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH", "serviceAccountKey.json")

if not firebase_admin._apps:
    if os.path.exists(_SERVICE_ACCOUNT_PATH):
        cred = credentials.Certificate(_SERVICE_ACCOUNT_PATH)
        firebase_admin.initialize_app(cred)
    else:
        # Allows the rest of the app (docs, non-auth routes) to import cleanly
        # even before you've dropped in your Firebase service account key.
        firebase_admin.initialize_app()


def _verify_token(authorization: str | None) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or malformed Authorization header")
    token = authorization.split(" ", 1)[1]
    try:
        return firebase_auth.verify_id_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired login token")


def _get_or_create_user(decoded: dict, db: Session) -> models.User:
    uid = decoded["uid"]
    user = db.query(models.User).filter(models.User.firebase_uid == uid).first()
    if user:
        return user
    user = models.User(
        firebase_uid=uid,
        name=decoded.get("name") or decoded.get("email", "").split("@")[0] or "Citizen",
        email=decoded.get("email"),
        role="citizen",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_current_user(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> models.User:
    decoded = _verify_token(authorization)
    return _get_or_create_user(decoded, db)


def get_optional_user(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> models.User | None:
    """Same as get_current_user but returns None instead of raising when the
    request has no/invalid token — for endpoints that are public but want to
    personalize the response (e.g. 'has this viewer already upvoted?')."""
    if not authorization:
        return None
    try:
        decoded = _verify_token(authorization)
    except HTTPException:
        return None
    return _get_or_create_user(decoded, db)
