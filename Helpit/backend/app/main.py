from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api.endpoints import settings, invoices, clients

app = FastAPI(title="Helpit API", description="Backend for Helpit SaaS")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(settings.router, prefix="/api/settings", tags=["settings"])
app.include_router(invoices.router, prefix="/api/invoices", tags=["invoices"])
app.include_router(clients.router, prefix="/api/clients", tags=["clients"])

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Helpit API running"}
