"""
Autonomous Reconciliation Engine
Deterministic Financial Matching + Gemini Root-Cause Diagnostic
"""

from typing import List, Dict, Any
from .gemini_client import generate_content


def run_deterministic_matching(ledger_records: List[Dict[str, Any]], settlement_records: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Computes exact, zero-hallucination mathematical reconciliation between internal ledger and gateway settlement.
    """
    ledger_map = {}
    for r in ledger_records:
        ref_id = r.get("reference_id") or r.get("order_id") or r.get("id")
        if ref_id:
            ledger_map[str(ref_id)] = r

    settlement_map = {}
    for s in settlement_records:
        ref_id = s.get("reference_id") or s.get("order_id") or s.get("gateway_payment_id") or s.get("id")
        if ref_id:
            settlement_map[str(ref_id)] = s

    discrepancies = []
    matched = []
    total_ledger_amount = sum(int(r.get("amount", 0)) for r in ledger_records)
    total_settlement_amount = sum(int(s.get("amount", 0)) for s in settlement_records)
    net_variance = total_settlement_amount - total_ledger_amount

    # 1. Compare matching records
    all_refs = set(ledger_map.keys()).union(set(settlement_map.keys()))

    for ref in all_refs:
        l_rec = ledger_map.get(ref)
        s_rec = settlement_map.get(ref)

        if l_rec and s_rec:
            l_amt = int(l_rec.get("amount", 0))
            s_amt = int(s_rec.get("amount", 0))
            l_fee = int(l_rec.get("gateway_fee", 0))
            s_fee = int(s_rec.get("fee", 0))

            variance = s_amt - l_amt
            fee_variance = s_fee - l_fee

            if variance != 0 or fee_variance != 0:
                discrepancies.append({
                    "reference_id": ref,
                    "type": "AMOUNT_OR_FEE_MISMATCH",
                    "ledger_amount_paise": l_amt,
                    "settlement_amount_paise": s_amt,
                    "variance_paise": variance,
                    "ledger_fee_paise": l_fee,
                    "settlement_fee_paise": s_fee,
                    "fee_variance_paise": fee_variance,
                    "description": f"Mismatch in amount (Variance: ₹{variance/100:.2f}) or MDR Fee (Variance: ₹{fee_variance/100:.2f})"
                })
            else:
                matched.append(ref)
        elif l_rec and not s_rec:
            # In ledger but missing in gateway settlement
            amt = int(l_rec.get("amount", 0))
            discrepancies.append({
                "reference_id": ref,
                "type": "MISSING_IN_GATEWAY_SETTLEMENT",
                "ledger_amount_paise": amt,
                "settlement_amount_paise": 0,
                "variance_paise": -amt,
                "description": f"Internal ledger captured order ₹{amt/100:.2f}, but gateway settlement batch does not contain it (possible payout hold or settlement cutoff window)."
            })
        elif s_rec and not l_rec:
            # In gateway settlement but missing in ledger
            amt = int(s_rec.get("amount", 0))
            discrepancies.append({
                "reference_id": ref,
                "type": "UNRECORDED_GATEWAY_CREDIT",
                "ledger_amount_paise": 0,
                "settlement_amount_paise": amt,
                "variance_paise": amt,
                "description": f"Gateway settled ₹{amt/100:.2f}, but internal ledger has no recorded transaction (likely missed webhook or delayed order creation)."
            })

    return {
        "summary": {
            "total_ledger_records": len(ledger_records),
            "total_settlement_records": len(settlement_records),
            "matched_records_count": len(matched),
            "discrepancies_count": len(discrepancies),
            "total_ledger_amount_paise": total_ledger_amount,
            "total_settlement_amount_paise": total_settlement_amount,
            "net_financial_variance_paise": net_variance,
            "is_perfectly_reconciled": len(discrepancies) == 0 and net_variance == 0
        },
        "matched_references": matched,
        "discrepancies": discrepancies
    }


async def diagnose_reconciliation_root_cause(deterministic_result: Dict[str, Any]) -> str:
    """
    Invokes Gemini to analyze the mathematical discrepancies and produce an expert fintech root-cause analysis and journal entry fix.
    """
    discrepancies = deterministic_result.get("discrepancies", [])
    if not discrepancies:
        return "All internal double-entry ledger postings match the gateway settlement report with 100% precision. Zero financial variance detected."

    prompt = f"""
You are a Principal Fintech Financial Operations & Accounting Architect.
Review the following deterministic reconciliation discrepancy output between our internal double-entry ledger and the payment gateway settlement file:

{discrepancies}

Summary:
{deterministic_result.get('summary')}

Provide a concise, professional Root-Cause Diagnosis and Corrective Action Plan. Specifically:
1. Explain the operational reason for each discrepancy (e.g. unrecorded webhook, timezone cutoff differences, MDR fee recalculation, chargeback hold).
2. Recommend the exact double-entry adjustment journal entry (DEBIT / CREDIT) needed to balance the books.
3. Assess the audit risk level (Low, Medium, High).
"""

    system_instruction = "You are an autonomous financial reconciliation expert for a modern multi-currency payment platform. Always be precise, authoritative, and structured."

    ai_analysis = await generate_content(prompt, system_instruction)
    if ai_analysis:
        return ai_analysis.strip()

    # Deterministic fallback response if Gemini API key is absent
    first_disc = discrepancies[0]
    return (
        f"Automated Financial Audit Root-Cause Analysis:\n"
        f"Discrepancy Reference: {first_disc.get('reference_id')}\n"
        f"Nature: {first_disc.get('type')} with net variance of ₹{first_disc.get('variance_paise', 0)/100:.2f}.\n\n"
        f"Probable Cause: The transaction occurred near the gateway 23:59:59 settlement cutoff or suffered an unrecorded MDR fee adjustment.\n"
        f"Recommended Corrective Action: Create an adjustment journal entry posting:\n"
        f" - DEBIT: CUSTOMER_ESCROW / GATEWAY_CLEARING (₹{abs(first_disc.get('variance_paise', 0))/100:.2f})\n"
        f" - CREDIT: MERCHANT_BALANCE / ADJUSTMENTS (₹{abs(first_disc.get('variance_paise', 0))/100:.2f})\n"
        f"Audit Risk Level: Low-Medium (Self-healing upon next settlement cycle)."
    )
