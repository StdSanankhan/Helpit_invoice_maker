import uuid
from typing import List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.core.db import read_json_db, write_json_db

router = APIRouter()

class Client(BaseModel):
    id: Optional[str] = None
    name: str
    company: str = ""
    email: str = ""
    phone: str = ""
    address: str = ""

@router.get("/", response_model=List[Client])
def get_clients():
    data = read_json_db("clients.json")
    if not data:
        return []
    return data

@router.post("/", response_model=Client)
def create_client(client: Client):
    data = read_json_db("clients.json")
    if not data:
        data = []
    
    client_dict = client.dict()
    client_dict["id"] = uuid.uuid4().hex
    
    data.append(client_dict)
    write_json_db("clients.json", data)
    
    return client_dict

@router.put("/{client_id}", response_model=Client)
def update_client(client_id: str, updated_client: Client):
    data = read_json_db("clients.json")
    if not data:
        raise HTTPException(status_code=404, detail="Client not found")
        
    for i, client in enumerate(data):
        if client.get("id") == client_id:
            client_dict = updated_client.dict()
            client_dict["id"] = client_id
            data[i] = client_dict
            write_json_db("clients.json", data)
            return client_dict
            
    raise HTTPException(status_code=404, detail="Client not found")

@router.delete("/{client_id}")
def delete_client(client_id: str):
    data = read_json_db("clients.json")
    if not data:
        raise HTTPException(status_code=404, detail="Client not found")
        
    filtered_data = [c for c in data if c.get("id") != client_id]
    
    if len(filtered_data) == len(data):
        raise HTTPException(status_code=404, detail="Client not found")
        
    write_json_db("clients.json", filtered_data)
    return {"status": "success", "message": "Client deleted"}
