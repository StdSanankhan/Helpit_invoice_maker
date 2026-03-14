from fastapi import APIRouter, HTTPException
from typing import List, Optional
import uuid
import base64
from datetime import datetime
from pydantic import BaseModel
from app.core.db import read_json_db, write_json_db
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders

router = APIRouter()

class InvoiceStatusUpdate(BaseModel):
    status: str

class InvoiceItem(BaseModel):
    description: str = ""
    quantity: int = 1
    price: float = 0.0
    tax_rate: float = 0.0

class Invoice(BaseModel):
    id: Optional[str] = None
    invoice_number: Optional[str] = None
    created_at: Optional[str] = None
    client_id: Optional[str] = None
    client_name: str
    client_email: str = ""
    due_date: str = ""
    notes: str = ""
    items: List[InvoiceItem] = []
    total: float = 0.0
    discount: float = 0.0
    status: str = "Draft"
    template_style: str = "modern"

class EmailPayload(BaseModel):
    to_email: str
    subject: str
    message: str
    invoice_id: str
    pdf_base64: str = ""

@router.post("/send-email")
def send_invoice_email(payload: EmailPayload):
    settings = read_json_db("settings.json")
    if not settings.get("smtp_host"):
        raise HTTPException(status_code=400, detail="SMTP settings not configured")

    try:
        msg = MIMEMultipart()
        msg['From'] = settings.get("smtp_user")
        msg['To'] = payload.to_email
        msg['Subject'] = payload.subject

        msg.attach(MIMEText(payload.message, 'plain'))
        
        # Attach PDF if provided
        if payload.pdf_base64:
            # PDF comes in as a data URL (e.g. "data:application/pdf;base64,xxxxxx"), or just raw base64.
            encoded = payload.pdf_base64
            if "," in encoded:
                _, encoded = encoded.split(",", 1)
                
            pdf_bytes = base64.b64decode(encoded)
            
            part = MIMEBase('application', 'octet-stream')
            part.set_payload(pdf_bytes)
            encoders.encode_base64(part)
            part.add_header('Content-Disposition', f'attachment; filename="Invoice_{payload.invoice_id}.pdf"')
            msg.attach(part)

        smtp_host = settings.get("smtp_host")
        smtp_port = settings.get("smtp_port", 587)
        smtp_user = settings.get("smtp_user")
        smtp_pass = settings.get("smtp_password")

        with smtplib.SMTP(smtp_host, int(smtp_port)) as server:
            server.starttls()
            if smtp_user and smtp_pass:
                server.login(smtp_user, smtp_pass)
            server.send_message(msg)
        
        return {"status": "success", "message": "Email sent successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")

@router.get("/", response_model=List[Invoice])
def list_invoices():
    return read_json_db("invoices.json")

@router.post("/", response_model=Invoice)
def create_invoice(invoice: Invoice):
    invoices = read_json_db("invoices.json")
    
    # Check for missing client_id
    if not invoice.client_id:
        raise HTTPException(status_code=400, detail="Client ID is required for the invoice.")

    invoice.id = str(uuid.uuid4())
    invoice.created_at = datetime.utcnow().isoformat()
    
    # Auto-generate invoice number if not provided
    if not invoice.invoice_number:
        today = datetime.now()
        count = len([inv for inv in invoices if inv.get("created_at", "").startswith(str(today.year))]) + 1
        invoice.invoice_number = f"INV-{today.year}-{count:03d}"
    
    # Calculate total correctly, accounting for discount
    subtotal = sum(item.quantity * item.price * (1 + item.tax_rate / 100) for item in invoice.items)
    invoice.total = subtotal - invoice.discount # Apply discount
    
    invoices.append(invoice.model_dump())
    write_json_db("invoices.json", invoices)
    return invoice

@router.get("/{invoice_id}", response_model=Invoice)
def get_invoice(invoice_id: str):
    invoices = read_json_db("invoices.json")
    for inv in invoices:
        if inv["id"] == invoice_id:
            return inv
    raise HTTPException(status_code=404, detail="Invoice not found")

@router.put("/{invoice_id}/status")
def update_invoice_status(invoice_id: str, status_update: InvoiceStatusUpdate):
    invoices = read_json_db("invoices.json")
    for i, inv in enumerate(invoices):
        if inv.get("id") == invoice_id:
            inv["status"] = status_update.status
            invoices[i] = inv
            write_json_db("invoices.json", invoices)
            return {"status": "success", "message": f"Invoice status updated to {status_update.status}", "invoice": inv}
    
    raise HTTPException(status_code=404, detail="Invoice not found")
