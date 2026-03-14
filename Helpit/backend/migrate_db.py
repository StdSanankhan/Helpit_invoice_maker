import asyncio
from datetime import datetime
from app.core.database import engine, Base, SessionLocal
from app.models.models import User, Business, Client, Invoice, InvoiceItem, Settings
from app.core.db import read_json_db

async def init_models():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

async def migrate_data():
    async with SessionLocal() as session:
        # Create default User and Business
        default_user = User(
            email="admin@helpit.com",
            password_hash="admin", # placeholder
            is_admin=True,
            subscription_status="Premium" # Give admin premium
        )
        session.add(default_user)
        # flush to get ID
        await session.flush()
        
        default_business = Business(
            owner_id=default_user.id,
            name="Default Business"
        )
        session.add(default_business)
        await session.flush()

        # Settings
        json_settings = read_json_db("settings.json") or {}
        new_settings = Settings(
            business_id=default_business.id,
            smtp_host=json_settings.get("smtp_host", ""),
            smtp_port=json_settings.get("smtp_port", 587),
            smtp_user=json_settings.get("smtp_user", ""),
            smtp_password=json_settings.get("smtp_password", "")
        )
        # Update business name/logo from settings
        default_business.name = json_settings.get("business_name", "Default Business")
        default_business.email = json_settings.get("business_email", "")
        default_business.logo = json_settings.get("business_logo", "")
        default_business.default_terms = json_settings.get("default_terms", "Standard terms apply.")
        
        session.add(new_settings)
        await session.flush()

        # Clients
        json_clients = read_json_db("clients.json") or []
        client_id_map = {}
        for c in json_clients:
            new_client = Client(
                id=c.get("id"),
                business_id=default_business.id,
                name=c.get("name", "Unknown"),
                company=c.get("company", ""),
                email=c.get("email", ""),
                phone=c.get("phone", ""),
                address=c.get("address", "")
            )
            session.add(new_client)
            client_id_map[c.get("id")] = new_client.id
            
        await session.flush()

        # Invoices
        json_invoices = read_json_db("invoices.json") or []
        for inv in json_invoices:
            # Parse created_at safely
            created_at = datetime.utcnow()
            if inv.get("created_at"):
                try:
                    created_at = datetime.fromisoformat(inv.get("created_at"))
                except ValueError:
                    pass

            new_invoice = Invoice(
                id=inv.get("id"),
                business_id=default_business.id,
                client_id=client_id_map.get(inv.get("client_id")),
                invoice_number=inv.get("invoice_number", ""),
                client_name=inv.get("client_name", ""),
                client_email=inv.get("client_email", ""),
                due_date=inv.get("due_date", ""),
                notes=inv.get("notes", ""),
                total=float(inv.get("total", 0.0)),
                discount=float(inv.get("discount", 0.0)),
                status=inv.get("status", "Draft"),
                template_style=inv.get("template_style", "modern"),
                created_at=created_at
            )
            session.add(new_invoice)
            
            # Map items
            for item in inv.get("items", []):
                new_item = InvoiceItem(
                    invoice_id=new_invoice.id,
                    description=item.get("description", ""),
                    quantity=float(item.get("quantity", 1.0)),
                    price=float(item.get("price", 0.0)),
                    tax_rate=float(item.get("tax_rate", 0.0))
                )
                session.add(new_item)

        try:
            await session.commit()
            print("Migration successful! Data moved to SQLite.")
        except Exception as e:
            await session.rollback()
            print(f"Migration failed: {e}")
            raise e

async def main():
    await init_models()
    await migrate_data()

if __name__ == "__main__":
    asyncio.run(main())
