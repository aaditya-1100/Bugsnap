import os

# Force isolated test database BEFORE importing app.database/app.config
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_bugsnap.db"
