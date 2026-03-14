from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class InvoiceItem(BaseModel):
    description: str
    quantity: float
    price: float
    tax_rate: float = 0.0

class InvoiceSchema(BaseModel):
    id: Optional[str] = None
    client_name: str
    client_email: str
    items: List[InvoiceItem]
    total: Optional[float] = 0.0
    due_date: Optional[str] = ""
    notes: Optional[str] = ""
    status: str = "draft"
    created_at: Optional[str] = None

class ContractSchema(BaseModel):
    id: Optional[str] = None
    client_name: str
    title: str
    content: str  # HTML or structured JSON of the contract
    status: str = "draft"
    created_at: Optional[str] = None
    signed_at: Optional[str] = None
    versions: List[Dict[str, Any]] = []

class EmailRequest(BaseModel):
    to_email: str
    subject: str
    message: str
    invoice_id: Optional[str] = None
