from pydantic import BaseModel
from typing import Optional

class SettingsSchema(BaseModel):
    business_name: str
    business_email: Optional[str] = ""
    business_logo: Optional[str] = ""
    default_terms: Optional[str] = "Standard terms apply."
    smtp_host: Optional[str] = ""
    smtp_port: Optional[int] = 587
    smtp_user: Optional[str] = ""
    smtp_password: Optional[str] = ""
