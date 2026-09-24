import json
import os

import firebase_admin
from fastapi import Depends, HTTPException, Header
from firebase_admin import auth as firebase_auth, credentials
from sqlalchemy.orm import Session

from . import models
from .database import get_db


def _initialize_firebase():
    if firebase_admin._apps:
        return

    # Local development: use serviceAccountKey.json
    service_account_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")

    if service_account_json:
        # Vercel / production
        service_account_info = json.loads(service_account_json)
        cred = credentials.Certificate(service_account_info)
        firebase_admin.initialize_app(cred)
        return

    # Local development fallback
    service_account_path = os.getenv(
        "FIREBASE_SERVICE_ACCOUNT_PATH",
        "serviceAccountKey.json",
    )

    if os.path.exists(service_account_path):
        cred = credentials.Certificate(service_account_path)
        firebase_admin.initialize_app(cred)
    else:
        firebase_admin.initialize_app()


_initialize_firebase()


def _verify_token(authorization: str | None) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Missing or malformed Authorization header",
        )

    token = authorization.split(" ", 1)[1]

    try:
        return firebase_auth.verify_id_token(token)
    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired login token",
        )


def _get_or_create_user(decoded: dict, db: Session) -> models.User:
    uid = decoded["uid"]

    user = (
        db.query(models.User)
        .filter(models.User.firebase_uid == uid)
        .first()
    )

    if user:
        return user

    user = models.User(
        firebase_uid=uid,
        name=decoded.get("name")
        or decoded.get("email", "").split("@")[0]
        or "Citizen",
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
    if not authorization:
        return None

    try:
        decoded = _verify_token(authorization)
    except HTTPException:
        return None

    return _get_or_create_user(decoded, db)
