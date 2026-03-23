FROM python:3.11-slim

# Minimal system deps for the API server (no Chrome — bot runs locally)
RUN apt-get update -qq && \
    apt-get install -y --no-install-recommends \
        curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# ── Python deps (cached unless requirements.txt changes) ──────────────────────
WORKDIR /app
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# ── App code ──────────────────────────────────────────────────────────────────
COPY . .

ENV PYTHONUNBUFFERED=1

CMD uvicorn backend.main:app --host 0.0.0.0 --port $PORT
