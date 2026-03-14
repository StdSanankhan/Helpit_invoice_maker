import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, ForeignKey, DateTime, Boolean, JSON, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid():
    return uuid.uuid4().hex

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)  # Placeholder for auth
    is_admin = Column(Boolean, default=False)
    
    # Separate plan from status
    plan = Column(String, default="free")                      # free | premium
    subscription_status = Column(String, default="inactive")   # inactive | pending | active | expired
    subscription_expiry = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    businesses = relationship("Business", back_populates="owner")
    payments = relationship("Payment", back_populates="user")
    subscriptions = relationship("Subscription", back_populates="user")

class Business(Base):
    __tablename__ = "businesses"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    owner_id = Column(String, ForeignKey("users.id"))
    
    name = Column(String)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    address = Column(String, nullable=True)
    tax_number = Column(String, nullable=True)
    logo = Column(String, nullable=True)
    default_terms = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="businesses")
    settings = relationship("Settings", back_populates="business", uselist=False)
    clients = relationship("Client", back_populates="business")
    invoices = relationship("Invoice", back_populates="business")

class Settings(Base):
    __tablename__ = "settings"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    business_id = Column(String, ForeignKey("businesses.id"))
    
    # SMTP
    smtp_host = Column(String, nullable=True)
    smtp_port = Column(Integer, default=587)
    smtp_user = Column(String, nullable=True)
    smtp_password = Column(String, nullable=True)
    
    # Payment Method Configs as JSON
    # Each should be: { "enabled": true, "account_title": "", "account_number": "", "qr_path": "" }
    easypaisa_config = Column(JSON, nullable=True)
    jazzcash_config = Column(JSON, nullable=True)
    bank_config = Column(JSON, nullable=True)

    business = relationship("Business", back_populates="settings")

class Client(Base):
    __tablename__ = "clients"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    business_id = Column(String, ForeignKey("businesses.id"))
    
    name = Column(String)
    company = Column(String, nullable=True)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    address = Column(String, nullable=True)

    business = relationship("Business", back_populates="clients")
    invoices = relationship("Invoice", back_populates="client")

class Invoice(Base):
    __tablename__ = "invoices"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    business_id = Column(String, ForeignKey("businesses.id"), nullable=True)
    client_id = Column(String, ForeignKey("clients.id"), nullable=True)
    
    invoice_number = Column(String)
    client_name = Column(String)
    client_email = Column(String, nullable=True)
    due_date = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    
    total = Column(Float, default=0.0)
    discount = Column(Float, default=0.0)
    status = Column(String, default="Draft")
    template_style = Column(String, default="modern")
    
    created_at = Column(DateTime, default=datetime.utcnow)

    business = relationship("Business", back_populates="invoices")
    client = relationship("Client", back_populates="invoices")
    items = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan")

class InvoiceItem(Base):
    __tablename__ = "invoice_items"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    invoice_id = Column(String, ForeignKey("invoices.id"))
    
    description = Column(String)
    quantity = Column(Float, default=1.0)
    price = Column(Float, default=0.0)
    tax_rate = Column(Float, default=0.0)

    invoice = relationship("Invoice", back_populates="items")

class Subscription(Base):
    __tablename__ = "subscriptions"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"))
    
    plan_name = Column(String)
    status = Column(String, default="Pending")
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="subscriptions")

class Payment(Base):
    __tablename__ = "payments"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"))
    
    payment_method = Column(String)   # easypaisa | jazzcash | bank_transfer
    amount = Column(Float)
    payment_proof = Column(String)    # filename of uploaded screenshot
    status = Column(String, default="Pending")  # Pending | Approved | Rejected
    
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="payments")
