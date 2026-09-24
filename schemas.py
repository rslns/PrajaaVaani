from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from .models import Category, ProblemStatus


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    role: str


class ProblemCreate(BaseModel):
    title: str
    description: str
    category: Category
    area_name: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class ProblemEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    from_status: Optional[ProblemStatus]
    to_status: ProblemStatus
    actor_role: str
    note: Optional[str]
    created_at: datetime


class ProblemMediaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    url: str
    media_type: str
    caption: Optional[str]
    created_at: datetime


class ViewerInfo(BaseModel):
    has_upvoted: bool = False
    my_rating: Optional[int] = None


class ProblemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    title: str
    description: str
    category: Category
    area_name: str
    reporter: UserOut
    latitude: Optional[float]
    longitude: Optional[float]
    current_status: ProblemStatus
    upvote_count: int
    severity_avg: float
    severity_count: int
    priority_score: int
    funding_estimated: Optional[float]
    funding_pledged: Optional[float]
    funding_received: Optional[float]
    funding_link: Optional[str]
    created_at: datetime


class ProblemDetailOut(ProblemOut):
    events: List[ProblemEventOut] = []
    media: List[ProblemMediaOut] = []
    viewer: ViewerInfo = ViewerInfo()


class StatusUpdate(BaseModel):
    to_status: ProblemStatus
    actor_role: str
    note: Optional[str] = None


class RatingIn(BaseModel):
    stars: int = Field(ge=1, le=5)


class FundingUpdate(BaseModel):
    funding_estimated: Optional[float] = None
    funding_pledged: Optional[float] = None
    funding_received: Optional[float] = None
    funding_link: Optional[str] = None
