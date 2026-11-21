"""
Gemini Client Manager for PayPulse AI
Supports google-genai and google-generativeai with deterministic offline fallbacks.
"""

import os
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

_genai_client = None
_has_gemini = False

if GEMINI_API_KEY:
    try:
        # Try google.genai (new SDK)
        from google import genai
        _genai_client = genai.Client(api_key=GEMINI_API_KEY)
        _has_gemini = True
        print(f"[AI-Service] Initialized Google GenAI Client with model {GEMINI_MODEL}")
    except Exception as e1:
        try:
            # Fallback to google.generativeai (classic SDK)
            import google.generativeai as legacy_genai
            legacy_genai.configure(api_key=GEMINI_API_KEY)
            _genai_client = legacy_genai.GenerativeModel(GEMINI_MODEL)
            _has_gemini = True
            print(f"[AI-Service] Initialized Legacy Google Generative AI with model {GEMINI_MODEL}")
        except Exception as e2:
            print(f"[AI-Service] Warning: Could not initialize Gemini SDK ({e1}, {e2}). Using deterministic offline fallbacks.")
            _has_gemini = False
else:
    print("[AI-Service] GEMINI_API_KEY not set. Operating with deterministic fintech offline intelligence.")


async def generate_content(prompt: str, system_instruction: str = None) -> str:
    """
    Calls Gemini API with prompt and returns generated text.
    Returns None if Gemini is not configured or an error occurs.
    """
    if not _has_gemini or not _genai_client:
        return None

    try:
        # Check if new genai client (has .models)
        if hasattr(_genai_client, "models"):
            response = _genai_client.models.generate_content(
                model=GEMINI_MODEL,
                contents=prompt,
                config={"system_instruction": system_instruction} if system_instruction else None
            )
            return response.text
        # Legacy generativeai GenerativeModel
        elif hasattr(_genai_client, "generate_content"):
            full_prompt = f"{system_instruction}\n\n{prompt}" if system_instruction else prompt
            response = _genai_client.generate_content(full_prompt)
            return response.text
    except Exception as err:
        print(f"[AI-Service] Gemini generation call failed: {err}. Falling back to deterministic engine.")
        return None

    return None
