import os
import base64
import uuid
from fastapi import APIRouter, Request
from fastapi.responses import FileResponse
from app.core.db import read_json_db, write_json_db, DATA_DIR

router = APIRouter()

LOGO_DIR = os.path.join(DATA_DIR, "logos")
os.makedirs(LOGO_DIR, exist_ok=True)

API_BASE = "http://localhost:8000"


def save_logo_file(data_url: str) -> str:
    """Save a base64 data URL to a file and return the filename."""
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


@router.get("/")
def get_settings():
    data = read_json_db("settings.json")
    if not data:
        data = {}
    # If logo is a stored filename, convert to full URL
    logo = data.get("business_logo", "")
    if logo and not logo.startswith("http") and not logo.startswith("data:"):
        data["business_logo"] = f"{API_BASE}/api/settings/logo/{logo}"
    return data


@router.get("/logo/{filename}")
def get_logo(filename: str):
    filepath = os.path.join(LOGO_DIR, filename)
    if os.path.exists(filepath):
        return FileResponse(filepath)
    return {"error": "Logo not found"}


from pydantic import BaseModel

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

@router.post("/")
async def update_settings(settings: SettingsUpdate):
    body = settings.dict()
    logo_value = body.get("business_logo", "")

    # If it's a base64 data URL, save to disk and store filename
    if logo_value and logo_value.startswith("data:"):
        filename = save_logo_file(logo_value)
        if filename:
            body["business_logo"] = filename
        else:
            body["business_logo"] = ""
    elif logo_value and logo_value.startswith(f"{API_BASE}/api/settings/logo/"):
        # Strip the base URL back to just the filename for storage
        body["business_logo"] = logo_value.replace(f"{API_BASE}/api/settings/logo/", "")

    write_json_db("settings.json", body)
    return {"status": "success", "data": body}
