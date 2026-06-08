import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Ensure backend directory is in path or load .env from the backend directory
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
dotenv_path = os.path.join(backend_dir, ".env")
load_dotenv(dotenv_path)

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("Error: DATABASE_URL not found in .env")
    sys.exit(1)

print("Connecting to database...")
engine = create_engine(DATABASE_URL)

migration_file = os.path.abspath(os.path.join(os.path.dirname(__file__), "income_tax_migration.sql"))
print(f"Reading migration file: {migration_file}")

with open(migration_file, "r") as f:
    sql_script = f.read()

# Split SQL by semicolons to execute in chunks, handling potential issues with execution of multi-statement blocks
statements = sql_script.split(";")

with engine.begin() as conn:
    print("Executing statements...")
    for idx, stmt in enumerate(statements):
        stmt_clean = stmt.strip()
        if not stmt_clean:
            continue
        try:
            conn.execute(text(stmt_clean))
        except Exception as e:
            print(f"Error executing statement #{idx}: {stmt_clean[:100]}...")
            print(f"Details: {e}")
            raise e

print("Migration completed successfully!")
