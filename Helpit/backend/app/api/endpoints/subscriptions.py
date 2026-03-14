import os
import shutil
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import datetime

from app.core.database import get_db
from app.models.models import User, Payment

router = APIRouter()

UPLOAD_DIR = "app/data/proofs"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Placeholder for real auth dependency — always returns first user
async def get_current_user(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).limit(1))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found. Please set up the application first.")
    return user

@router.get("/status")
async def get_subscription_status(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    """Return full subscription info for the current user. Also auto-checks for expiry."""
    # Auto-expiry check
    if (
        user.plan == "premium"
        and user.subscription_status == "active"
        and user.subscription_expiry
        and datetime.utcnow() > user.subscription_expiry
    ):
        user.plan = "free"
        user.subscription_status = "expired"
        user.updated_at = datetime.utcnow()
        await db.commit()

    return {
        "plan": user.plan,
        "subscription_status": user.subscription_status,
        "subscription_expiry": user.subscription_expiry.isoformat() if user.subscription_expiry else None,
    }

@router.post("/upgrade")
async def request_upgrade(
    payment_method: str = Form(...),
    amount: float = Form(...),
    proof: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Submit an upgrade payment request with proof of payment."""
    if user.plan == "premium" and user.subscription_status == "active":
        raise HTTPException(status_code=400, detail="You already have an active Premium subscription.")
    
    if user.subscription_status == "pending":
        raise HTTPException(status_code=400, detail="You already have a pending upgrade request. Please wait for admin approval.")
    
    # Save the uploaded proof file
    ext = proof.filename.split(".")[-1].lower()
    if ext not in ["jpg", "jpeg", "png", "pdf", "webp"]:
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload an image or PDF.")
    
    filename = f"proof_{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(proof.file, buffer)
    
    # Create payment record
    new_payment = Payment(
        user_id=user.id,
        payment_method=payment_method,
        amount=amount,
        payment_proof=filename,
        status="Pending"
    )
    db.add(new_payment)
    
    # Set user subscription_status to pending
    user.subscription_status = "pending"
    user.updated_at = datetime.utcnow()
    
    await db.commit()
    
    return {
        "status": "success",
        "message": "Upgrade request submitted. Your payment is pending admin approval. We'll process it within 24 hours."
    }
