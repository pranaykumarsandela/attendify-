import os

# Ideally this should be loaded from env file
SECRET_KEY = os.getenv("SECRET_KEY", "super-secret-jwt-key-for-fras-demo")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 1 day
