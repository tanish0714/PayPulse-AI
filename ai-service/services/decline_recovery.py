"""
Smart Payment Decline Recovery Engine
Decodes raw bank error codes into actionable recovery pathways
"""

from typing import Dict, Any
from .gemini_client import generate_content

BANK_ERROR_TAXONOMY = {
    "ERR_U16": {
        "title": "UPI Daily Limit Exceeded or Insufficient Clear Balance",
        "category": "CUSTOMER_ACCOUNT",
        "plain_explanation": "The customer's bank declined this UPI transaction because their daily transaction volume ceiling was breached or their primary account balance was insufficient.",
        "recommended_method": "NETBANKING_OR_CREDIT_CARD",
        "action": "Offer instant switch to Netbanking or Credit Card, or send a WhatsApp payment link active for 24 hours.",
        "recovery_rate": 0.78
    },
    "RISK_BLOCK": {
        "title": "Gateway Fraud & Velocity Threshold Flag",
        "category": "SECURITY_RISK",
        "plain_explanation": "The payment gateway or card network flagged the attempt due to rapid velocity retries or high risk score on the device IP.",
        "recommended_method": "3DS2_SMS_AUTHENTICATION",
        "action": "Step up authentication to high-assurance SMS 3DS OTP or request an alternate payment credential.",
        "recovery_rate": 0.54
    },
    "ISSUER_DOWN": {
        "title": "Issuing Bank Core Banking System Outage",
        "category": "INFRASTRUCTURE_UNAVAILABLE",
        "plain_explanation": "The customer's card issuing bank host switch is experiencing a temporary network outage or maintenance window.",
        "recommended_method": "DELAYED_SMART_RETRY",
        "action": "Schedule automatic re-trigger via secondary gateway switch in 15 minutes, or invite customer to use an alternate bank UPI app.",
        "recovery_rate": 0.85
    },
    "INSUFFICIENT_FUNDS": {
        "title": "Insufficient Cardholder Credit Limit or Balance",
        "category": "FUNDS_DEFICIT",
        "plain_explanation": "The issuing bank reported that the available balance or credit line does not cover the purchase price.",
        "recommended_method": "NO_COST_EMI_OR_SPLIT_PAY",
        "action": "Provide 3-month or 6-month No-Cost EMI options or allow split-payment across two payment methods.",
        "recovery_rate": 0.72
    }
}


async def diagnose_decline_and_recover(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Translates cryptic banking codes into human-readable diagnostics and smart recovery actions.
    """
    raw_code = (data.get("error_code") or "ERR_U16").upper()
    payment_method = data.get("method", "UPI").upper()
    amount = data.get("amount", 185000)

    # Match taxonomy
    taxonomy = BANK_ERROR_TAXONOMY.get(raw_code)
    if not taxonomy:
        # Default fallback match
        for key in BANK_ERROR_TAXONOMY:
            if key in raw_code or raw_code in key:
                taxonomy = BANK_ERROR_TAXONOMY[key]
                break
        if not taxonomy:
            taxonomy = BANK_ERROR_TAXONOMY["ERR_U16"]

    prompt = f"""
You are a Principal Payments Optimization Engineer.
A payment checkout attempt of ₹{amount/100:.2f} using {payment_method} failed with Bank Error Code: "{raw_code}".

Error Taxonomy Reference:
- Title: {taxonomy['title']}
- Category: {taxonomy['category']}

Provide:
1. A crisp, empathetic 2-sentence explanation of what went wrong for the customer.
2. A step-by-step smart recovery strategy for the merchant (e.g. payment rerouting, instant discount, SMS payment link, smart fallback method).
3. Suggested retry timing (immediate, 15m, or user-prompted).
"""

    system_instruction = "You are an expert in payment routing, churn reduction, and payment failure recovery."
    ai_guidance = await generate_content(prompt, system_instruction)

    return {
        "status": "SUCCESS",
        "error_code": raw_code,
        "category": taxonomy["category"],
        "title": taxonomy["title"],
        "plain_english_explanation": taxonomy["plain_explanation"],
        "recovery_strategy": {
            "primary_recommendation": taxonomy["recommended_method"],
            "suggested_action": taxonomy["action"],
            "estimated_recovery_rate": taxonomy["recovery_rate"],
            "ai_custom_analysis": ai_guidance or f"Prompt customer to complete checkout with {taxonomy['recommended_method']}. Estimated recovery likelihood: {int(taxonomy['recovery_rate']*100)}%."
        }
    }
