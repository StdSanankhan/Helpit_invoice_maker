"""
Migration script to add 'plan' and 'updated_at' columns to the users table.
Run from the backend directory: python migrate_add_plan.py
"""
import sqlite3
import os

DB_PATH = "./helpit.db"

if not os.path.exists(DB_PATH):
    print(f"Database not found at {DB_PATH}. Nothing to migrate.")
    exit(0)

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Check what columns exist
cursor.execute("PRAGMA table_info(users)")
existing_cols = {row[1] for row in cursor.fetchall()}
print(f"Existing columns: {existing_cols}")

# Add 'plan' column if missing
if 'plan' not in existing_cols:
    cursor.execute("ALTER TABLE users ADD COLUMN plan TEXT DEFAULT 'free'")
    print("Added column 'plan' with default 'free'")
else:
    print("Column 'plan' already exists.")

# Add 'updated_at' column if missing
if 'updated_at' not in existing_cols:
    cursor.execute("ALTER TABLE users ADD COLUMN updated_at DATETIME")
    print("Added column 'updated_at'")
else:
    print("Column 'updated_at' already exists.")

# Sync plan for any users who already have Premium subscription_status
cursor.execute(
    "UPDATE users SET plan = 'premium' WHERE subscription_status IN ('Premium', 'Active', 'active', 'premium')"
)
synced = cursor.rowcount
print(f"Synced plan=premium for {synced} existing premium user(s)")

# Normalize subscription_status for existing data from old format
cursor.execute("UPDATE users SET subscription_status = 'active' WHERE subscription_status IN ('Premium', 'Active')")
cursor.execute("UPDATE users SET subscription_status = 'pending' WHERE subscription_status IN ('Pending')")
cursor.execute("UPDATE users SET subscription_status = 'inactive' WHERE subscription_status IN ('Free', 'free', NULL, '')")
print("Normalized subscription_status values (uppercase -> lowercase)")

conn.commit()
conn.close()
print("\nMigration complete!")
