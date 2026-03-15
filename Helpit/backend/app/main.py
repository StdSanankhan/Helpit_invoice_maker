from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
# Use absolute imports for better compatibility in production/Docker
from app.api.endpoints import settings, invoices, clients, admin, subscriptions
from app.core.database import engine, Base

app = FastAPI(title="Helpit API", description="Backend for Helpit SaaS")

# Allow all origins for production compatibility
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
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

app.include_router(settings.router, prefix="/api/settings", tags=["settings"])
app.include_router(invoices.router, prefix="/api/invoices", tags=["invoices"])
app.include_router(clients.router, prefix="/api/clients", tags=["clients"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(subscriptions.router, prefix="/api/subscriptions", tags=["subscriptions"])

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Helpit API running"}

@app.get("/api/health")
def health_check():
    """Simple health check that does not require database connection."""
    return {"status": "ok"}
