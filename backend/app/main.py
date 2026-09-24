import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from . import models
from .database import Base, engine
from .routers import problems, users

# MVP: auto-create tables on startup. Swap for Alembic migrations before this
# ever touches a real deployment with data you care about.
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Prajaa Vaani API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten to your deployed frontend origin before going live
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(problems.router)
app.include_router(users.router)

# Serves uploaded photos/videos at http://<host>/uploads/<filename>.
# NOTE: on a free host like Render this disk is ephemeral — files vanish on
# redeploy/restart. Fine for local dev and demos; swap for Cloudinary/Supabase
# Storage (both free-tier) before treating uploads as permanent.
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.get("/health")
def health():
    return {"status": "ok"}
