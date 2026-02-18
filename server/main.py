from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, EmailStr
from src.services.account_service import create_mock_account

# create fastapi instance
app = FastAPI()

# Declare the UserSignUp Model
class UserSignUp(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    
# Create User endpoint
@app.post("/accounts/create")
async def register_user(user_data: UserSignUp):
    try:
        new_alpaca_account = create_mock_account(
            user_email=user_data.email,
            first_name=user_data.first_name,
            last_name=user_data.last_name
        )
        
        if new_alpaca_account is None:
            raise HTTPException(status_code=500, detail="Alpaca returned None")
        
        return {
            "status": "success",
            "message": "Mockvestor account created",
            "alpaca_account_id": new_alpaca_account.id
        }
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))