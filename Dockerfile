# ── Stage 1: Chrome + system deps (heavy layer, cached between builds) ────────
FROM python:3.11-slim AS base

RUN apt-get update -qq && \
    apt-get install -y --no-install-recommends \
        wget gnupg ca-certificates curl \
        xvfb python3-tk python3-dev \
        fonts-liberation libatk-bridge2.0-0 libatk1.0-0 libcups2 \
        libdbus-1-3 libgdk-pixbuf2.0-0 libnspr4 libnss3 libx11-xcb1 \
        libxcomposite1 libxdamage1 libxrandr2 libxss1 libxtst6 \
        libasound2 libpango-1.0-0 libpangocairo-1.0-0 \
    && wget -q https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb \
    && apt-get install -y ./google-chrome-stable_current_amd64.deb \
    && rm google-chrome-stable_current_amd64.deb \
    && rm -rf /var/lib/apt/lists/* \
    && google-chrome-stable --version

# ── Stage 2: Python deps (cached unless requirements.txt changes) ─────────────
WORKDIR /app
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# ── Stage 3: App code (only layer that changes on every push) ─────────────────
COPY . .

ENV PYTHONUNBUFFERED=1

CMD uvicorn backend.main:app --host 0.0.0.0 --port $PORT
