import uuid
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db
from app.models.models import Client as DBClient
from app.api.deps import get_default_business
from app.models.models import User

router = APIRouter()

class ClientBase(BaseModel):
    name: str
    company: str = ""
    email: str = ""
    phone: str = ""
    address: str = ""

class ClientCreate(ClientBase):
    pass

class Client(ClientBase):
    id: str

    class Config:
        from_attributes = True

@router.get("/", response_model=List[Client])
async def get_clients(db: AsyncSession = Depends(get_db), business = Depends(get_default_business)):
    result = await db.execute(select(DBClient).where(DBClient.business_id == business.id))
    clients = result.scalars().all()
    return clients

@router.post("/", response_model=Client)
async def create_client(client: ClientCreate, db: AsyncSession = Depends(get_db), business = Depends(get_default_business)):
    # Premium check
    user_result = await db.execute(select(User).where(User.id == business.owner_id))
    user = user_result.scalars().first()
    
    result = await db.execute(select(DBClient).where(DBClient.business_id == business.id))
    existing_clients = result.scalars().all()
    
    if user and user.plan != 'premium':
        if len(existing_clients) >= 5:
            raise HTTPException(status_code=403, detail="Free plan limit reached (5 clients maximum). Please upgrade to Pro.")

    db_client = DBClient(
        business_id=business.id,
        name=client.name,
        company=client.company,
        email=client.email,
        phone=client.phone,
        address=client.address
    )
    db.add(db_client)
    await db.commit()
    await db.refresh(db_client)
    return db_client

@router.put("/{client_id}", response_model=Client)
async def update_client(client_id: str, updated_client: ClientCreate, db: AsyncSession = Depends(get_db), business = Depends(get_default_business)):
    result = await db.execute(select(DBClient).where(DBClient.id == client_id, DBClient.business_id == business.id))
    db_client = result.scalars().first()
    
    if not db_client:
        raise HTTPException(status_code=404, detail="Client not found")
        
    db_client.name = updated_client.name
    db_client.company = updated_client.company
    db_client.email = updated_client.email
    db_client.phone = updated_client.phone
    db_client.address = updated_client.address
    
    await db.commit()
    await db.refresh(db_client)
    return db_client

@router.delete("/{client_id}")
async def delete_client(client_id: str, db: AsyncSession = Depends(get_db), business = Depends(get_default_business)):
    result = await db.execute(select(DBClient).where(DBClient.id == client_id, DBClient.business_id == business.id))
    db_client = result.scalars().first()
    
    if not db_client:
        raise HTTPException(status_code=404, detail="Client not found")
        
    await db.delete(db_client)
    await db.commit()
    return {"status": "success", "message": "Client deleted"}
