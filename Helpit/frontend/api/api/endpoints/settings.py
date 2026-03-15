import os
import base64
import uuid
from fastapi import APIRouter, Depends, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from ...core.database import get_db
from ..deps import get_default_business
from ...models.models import Settings as DBSettings
from ...core.db import DATA_DIR

router = APIRouter()
LOGO_DIR = os.path.join(DATA_DIR, "logos")
os.makedirs(LOGO_DIR, exist_ok=True)
API_BASE = os.getenv("API_BASE", "") # Relative in Vercel if possible

def save_logo_file(data_url: str) -> str:
    try:
        header, encoded = data_url.split(",", 1)
        ext = "png"
        if "jpeg" in header or "jpg" in header:
            ext = "jpg"
        elif "svg" in header:
            ext = "svg"
        filename = f"logo_{uuid.uuid4().hex}.{ext}"
        filepath = os.path.join(LOGO_DIR, filename)
        with open(filepath, "wb") as f:
            f.write(base64.b64decode(encoded))
        return filename
    except Exception:
        return ""

class SettingsUpdate(BaseModel):
    business_name: str = ""
    business_email: str = ""
    business_logo: str = ""
    business_phone: str = ""
    business_address: str = ""
    business_tax_number: str = ""
    default_terms: str = ""
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    easypaisa_config: dict = {}
    jazzcash_config: dict = {}
    bank_config: dict = {}

@router.get("/")
async def get_settings(db: AsyncSession = Depends(get_db), business = Depends(get_default_business)):
    result = await db.execute(select(DBSettings).where(DBSettings.business_id == business.id))
    settings = result.scalars().first()
    data = {
        "business_name": business.name,
        "business_email": business.email or "",
        "business_logo": business.logo or "",
        "business_phone": business.phone or "",
        "business_address": business.address or "",
        "business_tax_number": business.tax_number or "",
        "default_terms": business.default_terms or "",
    }
    if settings:
        data.update({
            "smtp_host": settings.smtp_host or "",
            "smtp_port": settings.smtp_port or 587,
            "smtp_user": settings.smtp_user or "",
            "smtp_password": settings.smtp_password or "",
            "easypaisa_config": settings.easypaisa_config or {},
            "jazzcash_config": settings.jazzcash_config or {},
            "bank_config": settings.bank_config or {},
        })
    else:
        settings = DBSettings(business_id=business.id)
        db.add(settings)
        await db.commit()
        data.update({
            "smtp_host": "", "smtp_port": 587, "smtp_user": "", "smtp_password": "",
            "easypaisa_config": {}, "jazzcash_config": {}, "bank_config": {}
        })
    logo = data.get("business_logo", "")
    if logo and not logo.startswith("http") and not logo.startswith("data:"):
        # In Vercel, logos won't persist across lambdas unless using external storage (S3).
        # Fallback to serving from /tmp or returning just the filename.
        data["business_logo"] = f"/api/settings/logo/{logo}"
    return data

@router.get("/logo/{filename}")
def get_logo(filename: str):
    filepath = os.path.join(LOGO_DIR, filename)
    if os.path.exists(filepath):
        return FileResponse(filepath)
    return {"error": "Logo not found"}

@router.post("/")
async def update_settings(payload: SettingsUpdate, db: AsyncSession = Depends(get_db), business = Depends(get_default_business)):
    logo_value = payload.business_logo
    if logo_value and logo_value.startswith("data:"):
        filename = save_logo_file(logo_value)
        logo_value = filename if filename else ""
    elif logo_value and "/api/settings/logo/" in logo_value:
        logo_value = logo_value.split("/api/settings/logo/")[-1]

    business.name = payload.business_name
    business.email = payload.business_email
    business.logo = logo_value
    business.phone = payload.business_phone
    business.address = payload.business_address
    business.tax_number = payload.business_tax_number
    business.default_terms = payload.default_terms

    result = await db.execute(select(DBSettings).where(DBSettings.business_id == business.id))
    settings = result.scalars().first()
    if not settings:
        settings = DBSettings(business_id=business.id)
        db.add(settings)
    settings.smtp_host = payload.smtp_host
    settings.smtp_port = payload.smtp_port
    settings.smtp_user = payload.smtp_user
    settings.smtp_password = payload.smtp_password
    settings.easypaisa_config = payload.easypaisa_config
    settings.jazzcash_config = payload.jazzcash_config
    settings.bank_config = payload.bank_config
    await db.commit()
    return {"status": "success", "data": payload.dict()}
