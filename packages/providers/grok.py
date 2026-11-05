"""
Grok Provider and API Client for xAI.
Provides direct integration with Grok models (grok-2, grok-beta, grok-vision)
for ReelBrain video autopsy, hook critique, and script synthesis.
"""

import json
import os
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Dict, List, Optional


def load_env_file() -> None:
    """Load API key from .env files if not already set."""
    candidates = [
        Path.cwd() / ".env",
        Path.cwd() / ".env.local",
        Path.home() / ".gemini" / ".env",
    ]
    for p in candidates:
        if p.is_file():
            try:
                with open(p, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            k, v = line.split("=", 1)
                            k = k.strip()
                            v = v.strip().strip("'\"")
                            if k in ("XAI_API_KEY", "GROK_API_KEY") and k not in os.environ:
                                os.environ[k] = v
            except Exception:
                pass


def get_xai_api_key(explicit_key: Optional[str] = None) -> Optional[str]:
    """Retrieves the xAI/Grok API key from argument, environment, or settings."""
    if explicit_key and explicit_key.strip():
        return explicit_key.strip()
    load_env_file()
    return os.getenv("XAI_API_KEY") or os.getenv("GROK_API_KEY")


def check_grok_status(api_key: Optional[str] = None) -> Dict[str, Any]:
    """Pings xAI /v1/models to verify credentials."""
    key = get_xai_api_key(api_key)
    if not key:
        return {
            "status": "unconfigured",
            "connected": False,
            "message": "Missing API key. Set XAI_API_KEY or GROK_API_KEY.",
            "models": [],
        }

    url = "https://api.x.ai/v1/models"
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    req = urllib.request.Request(url, headers=headers, method="GET")

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            models = [m.get("id") for m in data.get("data", []) if "id" in m]
            return {
                "status": "connected",
                "connected": True,
                "message": f"Connected to xAI Grok API ({len(models)} models available)",
                "models": sorted(models),
            }
    except Exception as e:
        return {
            "status": "error",
            "connected": False,
            "message": str(e),
            "models": [],
        }


def call_grok_chat(
    prompt: str,
    system_prompt: Optional[str] = None,
    model: str = "grok-2-latest",
    temperature: float = 0.7,
    api_key: Optional[str] = None,
) -> str:
    """Calls xAI's chat completion endpoint."""
    key = get_xai_api_key(api_key)
    if not key:
        raise ValueError(
            "xAI API key is missing. Set XAI_API_KEY or GROK_API_KEY in your environment, "
            "or pass an explicit key."
        )

    url = "https://api.x.ai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }

    sys_text = (
        system_prompt
        or "You are Grok Bot, an intelligent, sharp, and witty AI video strategist. "
        "Provide direct, high-impact critiques and viral short-form advice."
    )

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": sys_text},
            {"role": "user", "content": prompt},
        ],
        "temperature": temperature,
    }

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")

    try:
        with urllib.request.urlopen(req, timeout=40) as resp:
            res = json.loads(resp.read().decode("utf-8"))
            return res["choices"][0]["message"]["content"]
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"xAI API error {e.code}: {body}") from e
    except Exception as e:
        raise RuntimeError(f"Failed to communicate with Grok: {str(e)}") from e

