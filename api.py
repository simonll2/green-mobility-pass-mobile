from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from contextlib import asynccontextmanager

from core.database import init_db
from endpoints.endpoint_auth import router as auth_router
from endpoints.endpoint_user import router as user_router
from endpoints.endpoint_company import router as company_router
from endpoints.endpoint_journey import router as journey_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    print("DB initialized")
    yield 
    print("Shutting down...")


app = FastAPI(lifespan=lifespan)
app.include_router(auth_router)
app.include_router(user_router)
app.include_router(company_router)
app.include_router(journey_router)

