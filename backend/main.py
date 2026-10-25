import base64
import json
import os
import re
from typing import Optional

from google import genai
from google.genai import types
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ValidationError

load_dotenv()

MODEL = os.getenv("EXTRACT_MODEL", "gemini-flash-latest")
MAX_BYTES = 5 * 1024 * 1024  # 5 MB upload limit
ALLOWED_TYPES = {"image/png", "image/jpeg", "image/webp", "image/gif"}


class ClassEvent(BaseModel):
    title: str
    days: list[str]
    start_time: str
    end_time: str
    location: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None


class Schedule(BaseModel):
    events: list[ClassEvent]


PROMPT = f"""Extract every class meeting from this schedule screenshot.
Return ONLY a JSON object (no markdown, no commentary) matching this schema:
{json.dumps(Schedule.model_json_schema())}

Rules:
- Times in 24-hour "HH:MM" format (2:30 PM -> "14:30").
- Days as 3-letter English names: Mon, Tue, Wed, Thu, Fri, Sat, Sun.
- If a class meets on several days at the same time, put them in one event's "days" list.
- Use null for location/start_date/end_date when they are not shown.
- Dates as "YYYY-MM-DD".
- Do not invent classes that are not visible."""

app = FastAPI(title="Adventure Time API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv(
        "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174" 
    ).split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"ok": True}


@app.post("/extract-schedule", response_model=Schedule)
async def extract_schedule(file: UploadFile = File(...)):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(500, "GEMINI_API_KEY is not set on the server.")

    media_type = file.content_type or ""
    if media_type not in ALLOWED_TYPES:
        raise HTTPException(400, "Please upload a PNG, JPEG, WEBP, or GIF image.")

    raw = await file.read()
    if len(raw) > MAX_BYTES:
        raise HTTPException(413, "Image is too large (max 5 MB).")

    client = genai.Client(api_key=api_key)
    try:
        resp = await client.aio.models.generate_content(
            model=MODEL,
            contents=[types.Part.from_bytes(data=raw, mime_type=media_type), PROMPT],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=Schedule,
            ),
        )
    except Exception as e:
        raise HTTPException(502, f"AI request failed: {e}")

    try:
        return Schedule.model_validate_json(resp.text)
    except (ValidationError, TypeError):
        raise HTTPException(
            422, "Could not read a schedule from that image. Try a clearer screenshot."
        )