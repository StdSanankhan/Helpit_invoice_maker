import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.database import engine, Base
from .api.endpoints import settings, invoices, clients, admin, subscriptions

app = FastAPI()

# Only for local development; Vercel handles domain routing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    """Auto-create all DB tables on startup if they don't exist."""
    print("Starting up Helpit API on Vercel...")
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("Database tables created successfully.")
    except Exception as e:
        print(f"CRITICAL: Failed to create database tables: {e}")

@app.get("/api/health")
def health_check():
    return {"status": "ok", "environment": "vercel-serverless"}

@app.get("/api/python-test")
def python_test():
    return {"message": "Python Serverless is working!"}

# Include routers
# Note: In Vercel, the base path is usually the root of the api folder
app.include_router(settings.router, prefix="/api/settings", tags=["settings"])
app.include_router(invoices.router, prefix="/api/invoices", tags=["invoices"])
app.include_router(clients.router, prefix="/api/clients", tags=["clients"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(subscriptions.router, prefix="/api/subscriptions", tags=["subscriptions"])

# Vercel needs this to find the app
from . import app
