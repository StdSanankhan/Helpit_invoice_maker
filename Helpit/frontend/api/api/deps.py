from typing import Optional
from fastapi import Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from ..core.database import get_db
from ..models.models import Business, User

async def get_default_business(db: AsyncSession = Depends(get_db)) -> Business:
    result = await db.execute(select(Business).limit(1))
    business = result.scalars().first()
    if not business:
        # Create one fallback for simple usage
        new_user = User(
            email="fallback@helpit.com", 
            is_admin=True, 
            plan="premium",
            subscription_status="active"
        )
        db.add(new_user)
        await db.flush()
        
        business = Business(owner_id=new_user.id, name="Default Business")
        db.add(business)
        await db.commit()
    return business
