import uuid
from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field

class User(SQLModel, table=True):
    __tablemame__ = "profiles"
    # This is the primary key
    id: Optional[uuid.UUID] = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False
    )
    
    username: str = Field(index=True, unique=True, nullable=False)
    email: str = Field(unique=True, index=True, nullable=False)
    hashed_password: str = Field(nullable=False)
    
    alpaca_account_id: Optional[str] = Field(default=None, nullable=True)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = Field(default=True)