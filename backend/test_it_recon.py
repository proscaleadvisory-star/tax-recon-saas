import os
import io
import json
import pytest
from datetime import date
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from main import app, get_db

# Connect to database using .env
from dotenv import load_dotenv
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="module")
def test_context():
    db = TestingSessionLocal()
    try:
        # Fetch an existing profile to use as the tenant_id
        res = db.execute(text("SELECT id FROM public.profiles LIMIT 1")).fetchone()
        if not res:
            pytest.skip("No user profiles exist in database to run tests.")
        test_uid = str(res[0])
        yield {"db": db, "tenant_id": test_uid}
    finally:
        # Cleanup taxpayers registered during test run for this tenant
        db.execute(text("DELETE FROM public.taxpayers WHERE legal_name = 'Test Runner Individual'"))
        db.commit()
        db.close()

def test_taxpayer_registration(test_context):
    client = TestClient(app)
    tenant_id = test_context["tenant_id"]
    payload = {
        "pan": "TSTPA1234Z",
        "legal_name": "Test Runner Individual",
        "dob_or_incorp": "1990-01-01",
        "taxpayer_type": "Individual",
        "locale": "en",
        "tenant_id": tenant_id
    }
    
    # Register taxpayer
    response = client.post("/api/v1/taxpayers", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["taxpayer"]["legal_name"] == "Test Runner Individual"
    assert "id" in data["taxpayer"]
    
    # List taxpayers
    response = client.get(f"/api/v1/taxpayers?tenant_id={tenant_id}")
    assert response.status_code == 200
    taxpayers = response.json()
    assert len(taxpayers) >= 1
    # Check if our registered test taxpayer is in list
    assert any(t["pan_masked"] == "TSTXXXX34Z" for t in taxpayers)

def test_end_to_end_reconciliation(test_context):
    client = TestClient(app)
    tenant_id = test_context["tenant_id"]
    
    # 1. Register Taxpayer
    payload = {
        "pan": "TSTPA1234Z",
        "legal_name": "Test Runner Individual",
        "dob_or_incorp": "1990-01-01",
        "taxpayer_type": "Individual",
        "locale": "en",
        "tenant_id": tenant_id
    }
    res = client.post("/api/v1/taxpayers", json=payload)
    taxpayer_id = res.json()["taxpayer"]["id"]

    # 2. Upload Mock AIS JSON
    ais_data = {
        "source_type": "ais_json",
        "taxpayer_pan": "TSTPA1234Z",
        "tax_year": "2025-26",
        "records": [
            {
                "category": "TDS/TCS Information",
                "description": "TDS on Salary",
                "event_date": "2025-06-30",
                "counterparty_name": "Example Corp Ltd",
                "counterparty_id": "MUMT01234A",
                "gross_amount": 100000.00,
                "tax_amount": 10000.00
            },
            {
                "category": "TDS/TCS Information",
                "description": "TDS on Professional Fees",
                "event_date": "2025-09-30",
                "counterparty_name": "Consultant Partner",
                "counterparty_id": "BLRT98765B",
                "gross_amount": 50000.00,
                "tax_amount": 5000.00
            }
        ]
    }
    
    ais_file = io.BytesIO(json.dumps(ais_data).encode("utf-8"))
    response = client.post(
        "/api/v1/imports",
        data={
            "taxpayer_id": taxpayer_id,
            "source_type": "ais_json"
        },
        files={"file": ("ais_test.json", ais_file, "application/json")}
    )
    assert response.status_code == 200
    ais_batch_id = response.json()["import_batch_id"]

    # Normalize AIS batch
    response = client.post(f"/api/v1/imports/{ais_batch_id}/normalize")
    assert response.status_code == 200
    assert response.json()["normalized_records"] == 2

    # 3. Upload Mock Form 16 JSON
    f16_data = {
        "source_type": "form16_pdf",
        "taxpayer_pan": "TSTPA1234Z",
        "tax_year": "2025-26",
        "records": [
            {
                "event_type": "salary_income",
                "counterparty_name": "Example Corp Ltd",
                "counterparty_id": "MUMT01234A",
                "gross_amount": 100000.00,
                "tax_amount": 10000.00,
                "event_date": "2025-06-30"
            }
        ]
    }
    
    f16_file = io.BytesIO(json.dumps(f16_data).encode("utf-8"))
    response = client.post(
        "/api/v1/imports",
        data={
            "taxpayer_id": taxpayer_id,
            "source_type": "form16_pdf"
        },
        files={"file": ("form16_test.json", f16_file, "application/json")}
    )
    assert response.status_code == 200
    f16_batch_id = response.json()["import_batch_id"]

    # Normalize Form 16 batch
    response = client.post(f"/api/v1/imports/{f16_batch_id}/normalize")
    assert response.status_code == 200
    assert response.json()["normalized_records"] == 1

    # 4. Run Reconciliation
    response = client.post(
        "/api/v1/reconciliation/run",
        data={
            "taxpayer_id": taxpayer_id,
            "tax_year": "2025-26"
        }
    )
    assert response.status_code == 200
    recon_data = response.json()
    assert recon_data["status"] == "success"
    
    # We should have 1 exact match (Salary) and 1 unmatched (TDS on Professional Fees from AIS missing in books)
    assert recon_data["summary"]["matched_groups"] == 1
    assert recon_data["summary"]["unmatched_groups"] == 1
    assert recon_data["summary"]["exception_count"] == 1

    # 5. Fetch Exceptions
    response = client.get(f"/api/v1/exceptions?taxpayer_id={taxpayer_id}")
    assert response.status_code == 200
    exceptions = response.json()
    assert len(exceptions) == 1
    assert exceptions[0]["exception_type"] == "missing_in_books"
    assert exceptions[0]["status"] == "open"
    exception_id = exceptions[0]["id"]

    # 6. Create Remediation Task
    response = client.post(
        f"/api/v1/exceptions/{exception_id}/tasks",
        json={
            "action_type": "ask_deductor_revision",
            "due_date": "2025-12-31"
        }
    )
    assert response.status_code == 200
    task_id = response.json()["task_id"]

    # Get exception tasks
    response = client.get(f"/api/v1/exceptions/{exception_id}/tasks")
    assert response.status_code == 200
    tasks = response.json()
    assert len(tasks) == 1
    assert tasks[0]["status"] == "pending"

    # Resolve task
    response = client.post(
        f"/api/v1/tasks/{task_id}/resolve",
        json={
            "resolution_note": "Deductor contacted, confirmed they will correct TDS on Professional Fees.",
            "status": "resolved"
        }
    )
    assert response.status_code == 200
    
    # Exception status should now be updated to resolved since all tasks are resolved
    response = client.get(f"/api/v1/exceptions?taxpayer_id={taxpayer_id}")
    assert response.json()[0]["status"] == "resolved"

    # 7. Get Prefill ITR Handoff
    response = client.get(f"/api/v1/itr-handoff/{taxpayer_id}/2025-26")
    assert response.status_code == 200
    handoff = response.json()
    assert handoff["prefill_data"]["income_from_salary"] == 100000.00
    assert handoff["prefill_data"]["total_tds_tax_credits_claimable"] == 10000.00
    
    # 8. Export Audit Pack
    response = client.get(f"/api/v1/audit-pack/{taxpayer_id}/2025-26")
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/zip"
    assert len(response.content) > 1000
