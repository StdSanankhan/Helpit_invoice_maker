from typing import List
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from datetime import datetime, timedelta
import os

from app.core.database import get_db
from app.models.models import User, Business, Invoice, Subscription, Payment

router = APIRouter()

# Absolute path so it works regardless of where uvicorn is launched from
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
PROOF_DIR = os.path.join(BASE_DIR, "app", "data", "proofs")
os.makedirs(PROOF_DIR, exist_ok=True)

# Placeholder admin auth dependency
async def get_current_admin_user(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.is_admin == True).limit(1))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=403, detail="Not authorized. No admin user found.")
    return user

@router.get("/analytics")
async def get_admin_analytics(db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin_user)):
    users_result = await db.execute(select(func.count(User.id)))
    total_users = users_result.scalar() or 0
    
    biz_result = await db.execute(select(func.count(Business.id)))
    total_businesses = biz_result.scalar() or 0
    
    # Revenue from approved payments
    payment_result = await db.execute(select(func.sum(Payment.amount)).where(Payment.status == "Approved"))
    total_revenue = payment_result.scalar() or 0.0
    
    # Premium users count
    premium_result = await db.execute(select(func.count(User.id)).where(User.plan == "premium"))
    premium_users = premium_result.scalar() or 0
    
    # Invoices created today
    today = datetime.utcnow().date()
    all_invs = (await db.execute(select(Invoice.created_at))).scalars().all()
    invoices_today = sum(1 for d in all_invs if d and d.date() == today)

    return {
        "total_users": total_users,
        "total_businesses": total_businesses,
        "total_revenue": round(total_revenue, 2),
        "premium_users": premium_users,
        "invoices_today": invoices_today
    }

@router.get("/users")
async def list_users(db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin_user)):
    result = await db.execute(select(User))
    users = result.scalars().all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "is_admin": u.is_admin,
            "plan": u.plan,
            "subscription_status": u.subscription_status,
            "subscription_expiry": u.subscription_expiry.isoformat() if u.subscription_expiry else None,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        for u in users
    ]

@router.get("/payments/pending")
async def list_pending_payments(db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin_user)):
    result = await db.execute(select(Payment).where(Payment.status == "Pending"))
    payments = result.scalars().all()
    
    # Enrich with user email
    enriched = []
    for p in payments:
        user_res = await db.execute(select(User).where(User.id == p.user_id))
        user = user_res.scalars().first()
        enriched.append({
            "id": p.id,
            "user_id": p.user_id,
            "email": user.email if user else "Unknown",
            "payment_method": p.payment_method,
            "amount": p.amount,
            "payment_proof": p.payment_proof,
            "status": p.status,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        })
    return enriched

@router.get("/payments/all")
async def list_all_payments(db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin_user)):
    result = await db.execute(select(Payment).order_by(Payment.created_at.desc()))
    payments = result.scalars().all()
    
    enriched = []
    for p in payments:
        user_res = await db.execute(select(User).where(User.id == p.user_id))
        user = user_res.scalars().first()
        enriched.append({
            "id": p.id,
            "user_id": p.user_id,
            "email": user.email if user else "Unknown",
            "payment_method": p.payment_method,
            "amount": p.amount,
            "payment_proof": p.payment_proof,
            "status": p.status,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        })
    return enriched

@router.get("/proof/{filename}")
async def serve_proof(filename: str, admin: User = Depends(get_current_admin_user)):
    """Serve a proof screenshot file to the admin."""
    filepath = os.path.join(PROOF_DIR, filename)
    if os.path.exists(filepath):
        return FileResponse(filepath)
    raise HTTPException(status_code=404, detail="Proof file not found")

@router.post("/payments/{payment_id}/approve")
async def approve_payment(payment_id: str, db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin_user)):
    result = await db.execute(select(Payment).where(Payment.id == payment_id))
    payment = result.scalars().first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    if payment.status != "Pending":
        raise HTTPException(status_code=400, detail=f"Payment is already {payment.status}")
        
    payment.status = "Approved"
    
    # Upgrade User - set plan + status + expiry
    user_result = await db.execute(select(User).where(User.id == payment.user_id))
    user = user_result.scalars().first()
    if user:
        user.plan = "premium"
        user.subscription_status = "active"
        user.subscription_expiry = datetime.utcnow() + timedelta(days=30)
        user.updated_at = datetime.utcnow()
        
    await db.commit()
    return {"status": "success", "message": "Payment approved. User upgraded to Premium for 30 days."}

@router.post("/payments/{payment_id}/reject")
async def reject_payment(payment_id: str, db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin_user)):
    result = await db.execute(select(Payment).where(Payment.id == payment_id))
    payment = result.scalars().first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    payment.status = "Rejected"
    
    # Revert user subscription_status if it was pending
    user_result = await db.execute(select(User).where(User.id == payment.user_id))
    user = user_result.scalars().first()
    if user and user.subscription_status == "pending":
        user.subscription_status = "inactive"
        user.updated_at = datetime.utcnow()
    
    await db.commit()
    return {"status": "success", "message": "Payment rejected."}
