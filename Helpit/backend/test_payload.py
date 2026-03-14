import requests
import json

base64_str = "data:image/png;base64," + ("A" * 2 * 10)

payload = {
    "client_name": "Test",
    "client_email": "test@test.com",
    "due_date": "2026-03-06",
    "items": [{"description": "Oil", "quantity": 1, "price": 2000, "tax_rate": 0}],
    "total": 2000,
    "notes": ""
}

try:
    response = requests.post("http://127.0.0.1:8000/api/invoices/", json=payload)
    print("Status:", response.status_code)
    print("Body:", response.text)
except Exception as e:
    print("Error:", str(e))
