import sys
import os
from pathlib import Path
from loguru import logger

LOG_DIR = Path(__file__).resolve().parent / "logs"
LOG_FILE = LOG_DIR / "backend.log"

# Remove default logger
logger.remove()

# Add formatting for terminal logging
logger.add(
    sys.stderr,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan> - <level>{message}</level>",
    level="DEBUG"
)

"""
Persistent file logging
Automatically create a logs folder and rotate the file when it hits 10MB
"""
logger.add(
    str(LOG_FILE),
    rotation="10 MB",
    retention="10 days",
    level="INFO",
    enqueue=False,
    format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}"
)