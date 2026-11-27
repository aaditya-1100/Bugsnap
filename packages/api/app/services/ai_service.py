import json
from abc import ABC, abstractmethod
from dataclasses import dataclass

import httpx
from fastapi import HTTPException, status
from pydantic import BaseModel, Field

from app.config import settings


class StructuredReport(BaseModel):
    title: str = Field(description="Concise, clear bug title")
    description: str = Field(description="Structured summary of the issue")
    observed_behavior: str = Field(description="Only facts directly observed from user input, screenshot, or console errors")
    expected_behavior: str = Field(description="Expected behavior if stated, or clearly marked as [Assumed] if inferred")
    reproduction_steps: list[str] = Field(description="Ordered steps supported by evidence; mark uncertain steps clearly")
    suggested_severity: str = Field(description="critical | high | medium | low | unknown")
    severity_rationale: str = Field(description="Why this severity is suggested, noting any uncertainty")
    evidence_references: list[str] = Field(description="Specific evidence used (screenshot, URL, console error)")
    missing_information: list[str] = Field(description="Information needed to reproduce or diagnose that is not yet available")


@dataclass
class ReportContext:
    user_description: str | None
    page_url: str | None
    browser_info: dict
    viewport_info: dict
    console_errors: list
    annotations_summary: str | None = None
    screenshot_base64: str | None = None
    screenshot_mime: str = "image/webp"


class AIProvider(ABC):
    """Provider-independent interface for BugSnap Intelligence."""

    model_name: str

    @abstractmethod
    async def generate_report(self, context: ReportContext) -> tuple[StructuredReport, int, int]:
        """Generate a structured bug report. Returns (report, input_tokens, output_tokens)."""


class GeminiProvider(AIProvider):
    """Google Gemini Flash implementation using the REST API."""

    model_name = "gemini-3.5-flash-lite"
    fallback_models = ["gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-2.5-flash"]

    def __init__(self, api_key: str) -> None:
        self.api_key = api_key

    async def generate_report(self, context: ReportContext) -> tuple[StructuredReport, int, int]:
        if not self.api_key:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="GEMINI_API_KEY is not configured on the server.",
            )

        system_instruction = (
            "You are BugSnap Intelligence, a technical bug-report-writing assistant. "
            "Your job is to turn user-supplied evidence into a clean, structured, developer-ready bug report.\n"
            "STRICT RULES:\n"
            "1. Distinguish observed facts from assumptions. Prefix any inferred expectation with '[Assumed] '.\n"
            "2. NEVER invent reproduction steps or claim an issue was verified when it was not.\n"
            "3. List any missing information clearly in missing_information.\n"
            "4. Be concise, factual, and developer-focused.\n"
            "5. Return valid JSON matching the exact schema requested."
        )

        prompt_parts = [
            f"User description: {context.user_description or 'None provided'}",
            f"Page URL: {context.page_url or 'Unknown'}",
            f"Browser info: {json.dumps(context.browser_info)}",
            f"Viewport info: {json.dumps(context.viewport_info)}",
            f"Console errors: {json.dumps(context.console_errors[:10]) if context.console_errors else 'None captured'}",
        ]
        if context.annotations_summary:
            prompt_parts.append(f"Screenshot annotations: {context.annotations_summary}")

        prompt_parts.append(
            "\nReturn JSON with keys: title, description, observed_behavior, expected_behavior, "
            "reproduction_steps (array of strings), suggested_severity (critical|high|medium|low|unknown), "
            "severity_rationale, evidence_references (array of strings), missing_information (array of strings)."
        )

        parts: list[dict] = [{"text": "\n".join(prompt_parts)}]
        if context.screenshot_base64:
            parts.append(
                {
                    "inline_data": {
                        "mime_type": context.screenshot_mime,
                        "data": context.screenshot_base64,
                    }
                }
            )

        payload = {
            "systemInstruction": {"parts": [{"text": system_instruction}]},
            "contents": [{"role": "user", "parts": parts}],
            "generationConfig": {
                "responseMimeType": "application/json",
                "temperature": 0.2,
            },
        }

        resp = None
        async with httpx.AsyncClient(timeout=30.0) as client:
            for candidate_model in self.fallback_models:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{candidate_model}:generateContent?key={self.api_key}"
                resp = await client.post(url, json=payload)
                if resp.status_code == 200:
                    self.model_name = candidate_model
                    break
                if resp.status_code in (401, 403):
                    break

        assert resp is not None

        if resp.status_code in (401, 403):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid GEMINI_API_KEY. Create a free API key (starts with 'AIza') at aistudio.google.com/apikey and update packages/api/.env.",
            )
        if resp.status_code == 429:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="AI provider rate limit reached. Please wait a moment and try again.",
            )
        if resp.status_code != 200:
            err_msg = "AI provider returned an error while generating the report."
            try:
                err_data = resp.json()
                if err_data.get("error", {}).get("message"):
                    err_msg = f"AI provider error: {err_data['error']['message']}"
            except Exception:
                pass
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=err_msg,
            )

        data = resp.json()
        try:
            text = data["candidates"][0]["content"]["parts"][0]["text"]
            parsed = StructuredReport.model_validate_json(text)
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to parse structured AI output: {exc}",
            ) from exc

        usage = data.get("usageMetadata", {})
        input_tokens = int(usage.get("promptTokenCount", 0))
        output_tokens = int(usage.get("candidatesTokenCount", 0))
        return parsed, input_tokens, output_tokens


def get_ai_provider() -> AIProvider:
    return GeminiProvider(api_key=settings.GEMINI_API_KEY)
