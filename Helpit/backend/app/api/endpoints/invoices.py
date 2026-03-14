from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
import uuid
import base64
from datetime import datetime
from pydantic import BaseModel
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.api.deps import get_default_business
from app.models.models import Invoice as DBInvoice
from app.models.models import InvoiceItem as DBInvoiceItem
from app.models.models import Settings as DBSettings
from app.models.models import User

router = APIRouter()

class InvoiceStatusUpdate(BaseModel):
    status: str

class InvoiceItemSchema(BaseModel):
    description: str = ""
    quantity: float = 1.0
    price: float = 0.0
    tax_rate: float = 0.0
    
    class Config:
        from_attributes = True

class InvoiceSchema(BaseModel):
    id: Optional[str] = None
    invoice_number: Optional[str] = None
    created_at: Optional[datetime] = None
    client_id: Optional[str] = None
    client_name: str
    client_email: str = ""
    due_date: str = ""
    notes: str = ""
    items: List[InvoiceItemSchema] = []
    total: float = 0.0
    discount: float = 0.0
    status: str = "Draft"
    template_style: str = "modern"
    
    class Config:
        from_attributes = True

class EmailPayload(BaseModel):
    to_email: str
    subject: str
    message: str
    invoice_id: str
    pdf_base64: str = ""

@router.post("/send-email")
async def send_invoice_email(
    payload: EmailPayload, 
    db: AsyncSession = Depends(get_db), 
    business = Depends(get_default_business)
):
    # Premium check
    user_result = await db.execute(select(User).where(User.id == business.owner_id))
    user = user_result.scalars().first()
    if user and user.plan != 'premium':
        raise HTTPException(status_code=403, detail="Direct email sending is a Premium feature. Please upgrade to Pro.")

    result = await db.execute(select(DBSettings).where(DBSettings.business_id == business.id))
    settings = result.scalars().first()
    
    if not settings or not settings.smtp_host:
        raise HTTPException(status_code=400, detail="SMTP settings not configured")

    try:
        msg = MIMEMultipart()
        msg['From'] = settings.smtp_user
        msg['To'] = payload.to_email
        msg['Subject'] = payload.subject

        msg.attach(MIMEText(payload.message, 'plain'))
        
        # Attach PDF if provided
        if payload.pdf_base64:
            encoded = payload.pdf_base64
            if "," in encoded:
                _, encoded = encoded.split(",", 1)
                
            pdf_bytes = base64.b64decode(encoded)
            
            part = MIMEBase('application', 'octet-stream')
            part.set_payload(pdf_bytes)
            encoders.encode_base64(part)
            part.add_header('Content-Disposition', f'attachment; filename="Invoice_{payload.invoice_id}.pdf"')
            msg.attach(part)

        smtp_host = settings.smtp_host
        smtp_port = settings.smtp_port or 587
        smtp_user = settings.smtp_user
        smtp_pass = settings.smtp_password

        with smtplib.SMTP(smtp_host, int(smtp_port)) as server:
            server.starttls()
            if smtp_user and smtp_pass:
                server.login(smtp_user, smtp_pass)
            server.send_message(msg)
        
        return {"status": "success", "message": "Email sent successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")

@router.get("/", response_model=List[InvoiceSchema])
async def list_invoices(db: AsyncSession = Depends(get_db), business = Depends(get_default_business)):
    result = await db.execute(
        select(DBInvoice)
        .where(DBInvoice.business_id == business.id)
        .options(selectinload(DBInvoice.items))
        .order_by(DBInvoice.created_at.desc())
    )
    return result.scalars().all()

@router.post("/", response_model=InvoiceSchema)
async def create_invoice(invoice: InvoiceSchema, db: AsyncSession = Depends(get_db), business = Depends(get_default_business)):
    if not invoice.client_id:
        raise HTTPException(status_code=400, detail="Client ID is required for the invoice.")

    # Premium limit check
    user_result = await db.execute(select(User).where(User.id == business.owner_id))
    user = user_result.scalars().first()
    
    # fetch all invoices for counting
    result = await db.execute(select(DBInvoice).where(DBInvoice.business_id == business.id))
    invs = result.scalars().all()

    if user and user.plan != 'premium':
        if len(invs) >= 3:
            raise HTTPException(status_code=403, detail="Free plan limit reached (3 invoices maximum). Please upgrade to Pro.")

    # Auto-generate invoice number if not provided
    auto_inv_num = invoice.invoice_number
    if not auto_inv_num:
        today = datetime.now()
        count = len([i for i in invs if i.created_at and i.created_at.year == today.year]) + 1
        auto_inv_num = f"INV-{today.year}-{count:03d}"
    
    subtotal = sum(item.quantity * item.price * (1 + item.tax_rate / 100) for item in invoice.items)
    total = subtotal - invoice.discount
    
    db_invoice = DBInvoice(
        business_id=business.id,
        client_id=invoice.client_id,
        invoice_number=auto_inv_num,
        client_name=invoice.client_name,
        client_email=invoice.client_email,
        due_date=invoice.due_date,
        notes=invoice.notes,
        total=total,
        discount=invoice.discount,
        status=invoice.status,
        template_style=invoice.template_style
    )
    db.add(db_invoice)
    await db.flush() # get ID
    
    for item in invoice.items:
        db_item = DBInvoiceItem(
            invoice_id=db_invoice.id,
            description=item.description,
            quantity=item.quantity,
            price=item.price,
            tax_rate=item.tax_rate
        )
        db.add(db_item)
        
    await db.commit()
    await db.refresh(db_invoice)
    
    # Needs to load items for response
    result = await db.execute(
        select(DBInvoice)
        .where(DBInvoice.id == db_invoice.id)
        .options(selectinload(DBInvoice.items))
    )
    return result.scalars().first()

@router.get("/{invoice_id}", response_model=InvoiceSchema)
async def get_invoice(invoice_id: str, db: AsyncSession = Depends(get_db), business = Depends(get_default_business)):
    result = await db.execute(
        select(DBInvoice)
        .where(DBInvoice.id == invoice_id, DBInvoice.business_id == business.id)
        .options(selectinload(DBInvoice.items))
    )
    db_invoice = result.scalars().first()
    if not db_invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return db_invoice

@router.put("/{invoice_id}/status")
async def update_invoice_status(invoice_id: str, status_update: InvoiceStatusUpdate, db: AsyncSession = Depends(get_db), business = Depends(get_default_business)):
    result = await db.execute(
        select(DBInvoice)
        .where(DBInvoice.id == invoice_id, DBInvoice.business_id == business.id)
        .options(selectinload(DBInvoice.items))
    )
    db_invoice = result.scalars().first()
    
    if not db_invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    db_invoice.status = status_update.status
    await db.commit()
    await db.refresh(db_invoice)
    
    return {"status": "success", "message": f"Invoice status updated to {status_update.status}", "invoice": db_invoice}
