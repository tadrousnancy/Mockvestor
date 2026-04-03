import uuid
from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field

class Transaction(SQLModel, table=True):
    __tablename__ = "transaction"
    __tableargs__ = {"schema": "public"}
    
    # Primary Key
    id: Optional[uuid.UUID] = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False
    )
    
    # Foreign key linking directly to User table
    user_id: uuid.UUID = Field(foreign_key="public.user.id", index=True, nullable=False)
    
    # Alpaca Trade Data
    alpaca_order_id: str = Field(index=True, nullable=False)
    symbol: str = Field(index=True, nullable=False)
    qty: float = Field(nullable=False)
    side: str = Field(nullable=False)
    status: str = Field(nullable=False)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)