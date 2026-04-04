import os
import jwt
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from pathlib import Path
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# Load the environment variable
env_path = Path(__file__).parent.parent / "core" / ".env"
load_dotenv(dotenv_path=env_path)

# Retrieve secret key
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "super_secret_development_key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # Token expires in 7 days

def create_access_token(user_id: str):
    """
    Generates JWT access token for the given user_id
    """
    
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {
        "sub": user_id,
        "exp": expire
    }
    
    # Sign and return the token
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    
    return encoded_jwt

# Direct frontend to aquire a token
#oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/accounts/login")
security = HTTPBearer()

def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Decodes the JWT and returns the user's ID.
    Rejects the request if the broken is invalid or expired.
    """
    
    # Extract the token string from credentials object
    token = credentials.credentials
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Decode the token using the secret key
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        # Extract the user ID (stored in "sub")
        user_id: str = payload.get("sub")
        
        if user_id is None:
            raise credentials_exception
        
        return user_id
    
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expried. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise credentials_exception