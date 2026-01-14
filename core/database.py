import os
from sqlmodel import SQLModel, create_engine, Session

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is not set. Please configure it in .env file.")

engine = create_engine(DATABASE_URL, echo=True)


def init_db():
    """Initialise la base de donnees en creant toutes les tables."""
    SQLModel.metadata.create_all(engine)


def get_session():
    """Generateur de session pour les endpoints FastAPI."""
    with Session(engine) as session:
        yield session
