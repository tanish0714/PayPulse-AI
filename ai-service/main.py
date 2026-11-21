"""
PayPulse AI Microservice — Autonomous Reconciliation & Dispute Engine
FastAPI + Google Gemini + Pydantic
"""

from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn
import os

from services.reconciliation import run_deterministic_matching, diagnose_reconciliation_root_cause
from services.dispute import generate_chargeback_rebuttal
from services.decline_recovery import diagnose_decline_and_recover

app = FastAPI(
    title="PayPulse AI Microservice",
    description="Autonomous Payment Ledger Reconciliation, Chargeback Defense & Decline Recovery",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- PYDANTIC SCHEMAS ---
class ReconcileRequest(BaseModel):
    ledger_records: List[Dict[str, Any]] = Field(default_factory=list, description="Internal ledger entries")
    settlement_records: List[Dict[str, Any]] = Field(default_factory=list, description="Gateway settlement batch entries")


class DisputeRequest(BaseModel):
    order_id: str
    customer_name: Optional[str] = "Customer"
    customer_email: Optional[str] = "customer@example.com"
    amount: int = Field(default=450000, description="Amount in paise")
    currency: Optional[str] = "INR"
    dispute_reason: Optional[str] = "Fraudulent Charge / Unrecognized"
    reason_code: Optional[str] = "10.4"
    ip_address: Optional[str] = "103.21.244.12"
    device_fingerprint: Optional[str] = "fp_client_hash_982b"
    delivery_timestamp: Optional[str] = "2026-11-21T14:05:00Z"


class DeclineRecoveryRequest(BaseModel):
    error_code: str = Field(default="ERR_U16", description="Bank error code (e.g. ERR_U16, RISK_BLOCK, ISSUER_DOWN)")
    method: Optional[str] = "UPI"
    amount: Optional[int] = 185000


# --- ROUTES ---
@app.get("/health")
def health_check():
    return {
        "status": "HEALTHY",
        "service": "PayPulse AI Microservice",
        "gemini_active": bool(os.getenv("GEMINI_API_KEY"))
    }


@app.post("/ai/reconcile")
async def reconcile_ledger_vs_settlement(req: ReconcileRequest):
    """
    1. Deterministically calculates exact financial discrepancies (zero math hallucination).
    2. Employs Gemini to diagnose root-causes and recommend corrective double-entry journal postings.
    """
    try:
        # Step 1: Zero-hallucination deterministic matching
        deterministic_result = run_deterministic_matching(req.ledger_records, req.settlement_records)

        # Step 2: Gemini Root-Cause Analysis
        ai_diagnosis = await diagnose_reconciliation_root_cause(deterministic_result)

        return {
            "status": "SUCCESS",
            "summary": deterministic_result["summary"],
            "matched_count": deterministic_result["summary"]["matched_records_count"],
            "discrepancies": deterministic_result["discrepancies"],
            "ai_root_cause_analysis": ai_diagnosis
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/ai/dispute-rebuttal")
async def create_dispute_rebuttal(req: DisputeRequest):
    """
    Retrieves card network chargeback defense rules and generates a bank-grade formal rebuttal packet.
    """
    try:
        result = await generate_chargeback_rebuttal(req.model_dump())
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/ai/decline-recovery")
async def recover_payment_decline(req: DeclineRecoveryRequest):
    """
    Analyzes raw bank decline codes and generates an intelligent customer recovery action.
    """
    try:
        result = await diagnose_decline_and_recover(req.model_dump())
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    print(f"🚀 Starting PayPulse AI Microservice on http://{host}:{port}")
    uvicorn.run("main:app", host=host, port=port, reload=True)
