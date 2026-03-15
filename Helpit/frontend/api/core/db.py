import json
import os
from filelock import FileLock
from typing import Dict, Any, List

# In Vercel, we can't write to the filesystem except /tmp, 
# but for local dev this directory logic holds.
DATA_DIR = "/tmp/data" if os.getenv("VERCEL") else os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")

def get_data_file(filename: str) -> str:
    os.makedirs(DATA_DIR, exist_ok=True)
    filepath = os.path.join(DATA_DIR, filename)
    if not os.path.exists(filepath):
        if filename == "settings.json":
            initial = {"business_name": "Helpit SaaS", "business_email": "", "business_logo": "", "default_terms": "Standard terms apply."}
        else:
            initial = []
        with open(filepath, "w") as f:
            json.dump(initial, f)
    return filepath

def read_json_db(filename: str) -> Any:
    filepath = get_data_file(filename)
    lockpath = filepath + ".lock"
    with FileLock(lockpath):
        with open(filepath, "r") as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                return {} if filename == "settings.json" else []

def write_json_db(filename: str, data: Any):
    filepath = get_data_file(filename)
    lockpath = filepath + ".lock"
    with FileLock(lockpath):
        with open(filepath, "w") as f:
            json.dump(data, f, indent=4)
