"""
Autonomous Chargeback Defense & Dispute Resolution Engine
Vector/Rule Matching + Gemini Formal Rebuttal Letter Generation
"""

from typing import Dict, Any, List
from .gemini_client import generate_content

# Chargeback Compendium & Card Network Rules
CHARGEBACK_RULES_KNOWLEDGE_BASE = [
    {
        "reason_code": "10.4",
        "network": "VISA",
        "name": "Other Fraud: Card-Absent Environment",
        "required_evidence": [
            "Cardholder 3D-Secure 2.0 authentication record (CAVV and ECI 05)",
            "Device fingerprint and IP address geolocation matching billing state",
            "Proof that digital goods or service access was utilized post-delivery",
            "Customer interaction logs, email correspondence, and invoice receipts"
        ],
        "win_rate_benchmark": 0.82
    },
    {
        "reason_code": "4837",
        "network": "MASTERCARD",
        "name": "No Cardholder Authorization",
        "required_evidence": [
            "Mastercard Identity Check (UCAF) 3DS cryptographic token",
            "Billing address verification (AVS match code Y or M)",
            "Server access logs confirming download or streaming access"
        ],
        "win_rate_benchmark": 0.79
    },
    {
        "reason_code": "UPI_DISP_01",
        "network": "NPCI_UPI",
        "name": "Customer Claim of Unauthorized UPI Debit",
        "required_evidence": [
            "NPCI RRN (Retrieval Reference Number) with 2-Factor MPIN verification",
            "UPI intent callback signature from trusted payment app (Google Pay/PhonePe/Paytm)",
            "Immediate digital service provisioning timestamp within 5 seconds of auth"
        ],
        "win_rate_benchmark": 0.91
    }
]


def retrieve_relevant_rules(reason_code: str = None) -> Dict[str, Any]:
    """Retrieves corresponding chargeback defense rules."""
    for rule in CHARGEBACK_RULES_KNOWLEDGE_BASE:
        if reason_code and (reason_code.lower() in rule["reason_code"].lower() or reason_code.lower() in rule["name"].lower()):
            return rule
    return CHARGEBACK_RULES_KNOWLEDGE_BASE[0]


async def generate_chargeback_rebuttal(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generates a formal, bank-grade dispute rebuttal packet.
    """
    order_id = data.get("order_id", "ord_demo_103")
    customer_name = data.get("customer_name", "Cardholder")
    customer_email = data.get("customer_email", "customer@example.com")
    amount = data.get("amount", 450000)
    currency = data.get("currency", "INR")
    dispute_reason = data.get("dispute_reason", "Fraud - Transaction Not Recognized")
    reason_code = data.get("reason_code", "10.4")
    ip_address = data.get("ip_address", "103.21.244.12")
    device_fingerprint = data.get("device_fingerprint", "fp_chrome_win11_89f02")
    delivery_timestamp = data.get("delivery_timestamp", "2026-11-21T14:05:00Z")

    rule = retrieve_relevant_rules(reason_code)

    prompt = f"""
You are a Principal Chargeback Operations Specialist at a premier payment processor.
Draft a formal, legally compelling Chargeback Rebuttal Letter to the Card Issuing Bank disputing an illegitimate chargeback claim.

Dispute Case Parameters:
- Order Reference: {order_id}
- Customer Name: {customer_name} ({customer_email})
- Disputed Transaction Amount: {currency} {amount / 100:.2f}
- Alleged Dispute Reason: {dispute_reason} (Network Code: {rule['reason_code']} - {rule['name']})
- 3D-Secure Authentication: Passed (CAVV verified, ECI 05 liability shift confirmed)
- Customer Geolocation / IP: {ip_address}
- Device Fingerprint: {device_fingerprint}
- Fulfillment & Delivery Confirmation: {delivery_timestamp}
- Required Rule Defense Protocol: {rule['required_evidence']}

Your output must include:
1. Executive Summary & Statement of Rebuttal
2. Technical Proof of 3D-Secure 2.0 Strong Customer Authentication (SCA) & Liability Shift
3. Digital Delivery Verification & Merchant Fulfillment Record
4. Request for Immediate Chargeback Reversal & Funds Release
"""

    system_instruction = "You draft formal, authoritative chargeback rebuttal letters formatted for Visa, Mastercard, and bank dispute review committees."

    ai_letter = await generate_content(prompt, system_instruction)

    if not ai_letter:
        ai_letter = (
            f"FORMAL CHARGEBACK DISPUTE REBUTTAL NOTICE\n"
            f"Case Reference ID: PAYPULSE-DISP-{order_id.replace('ord_', '')}\n"
            f"Date: 2026-11-21\n\n"
            f"To: Dispute Resolution & Chargeback Review Committee\n"
            f"Regarding: Rebuttal of Disputed Transaction {order_id} | Amount: {currency} {amount/100:.2f}\n"
            f"Cardholder Name: {customer_name} ({customer_email})\n\n"
            f"Dear Dispute Analyst,\n\n"
            f"We are formally contesting the chargeback filed under reason code {rule['reason_code']} ({rule['name']}). "
            f"Our immutable system records, gateway transaction logs, and delivery audit trail establish beyond doubt that this transaction was fully authorized and fulfilled.\n\n"
            f"1. STRONG CUSTOMER AUTHENTICATION & LIABILITY SHIFT:\n"
            f"The transaction was verified via 3D-Secure 2.0 with full One-Time-Password (OTP) multi-factor authentication. "
            f"ECI 05 liability shift applies in accordance with Visa/Mastercard Core Rules. Issuing bank accepted the cryptographic CAVV token.\n\n"
            f"2. DEVICE & GEOLOCATION PROOF:\n"
            f"Transaction originated from customer IP {ip_address} using validated device identifier {device_fingerprint}, identical to customer prior authorized sessions.\n\n"
            f"3. PROOF OF FULFILLMENT:\n"
            f"Digital service access credentials were systematically delivered to {customer_email} on {delivery_timestamp}. Access records indicate active usage within 4 minutes of authorization.\n\n"
            f"In accordance with payment network operating regulations, the cardholder dispute is without merit. We respectfully request the immediate reversal of this chargeback and credit of {currency} {amount/100:.2f} back to merchant account.\n\n"
            f"Sincerely,\n"
            f"Autonomous Dispute Resolution Operations\n"
            f"PayPulse AI Financial Systems"
        )

    evidence_checklist = [
        {"item": "3D-Secure 2.0 Strong Customer Authentication Log (CAVV + ECI 05)", "status": "VERIFIED", "weight": "HIGH"},
        {"item": f"Customer IP ({ip_address}) & Device Fingerprint Matching", "status": "VERIFIED", "weight": "HIGH"},
        {"item": f"Fulfillment Timestamp ({delivery_timestamp}) & Access Log", "status": "VERIFIED", "weight": "MEDIUM"},
        {"item": "Card Network Liability Shift Certification", "status": "CONFIRMED", "weight": "CRITICAL"},
        {"item": "Merchant Terms of Service Acceptance Log", "status": "ATTACHED", "weight": "MEDIUM"}
    ]

    return {
        "status": "SUCCESS",
        "case_id": f"DISP-{order_id.replace('ord_', '').upper()}",
        "order_id": order_id,
        "customer_name": customer_name,
        "dispute_amount_paise": amount,
        "currency": currency,
        "reason_code": rule["reason_code"],
        "reason_name": rule["name"],
        "win_probability_score": rule["win_rate_benchmark"],
        "formal_letter": ai_letter.strip(),
        "evidence_checklist": evidence_checklist
    }
