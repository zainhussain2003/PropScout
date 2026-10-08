# One free instance: only the Node API is public; Python stays on loopback.
FROM node:22-bookworm-slim
ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    NODE_ENV=production \
    NODE_OPTIONS=--max-old-space-size=128 \
    FREE_ONLY_BETA=true \
    GEOCODING_PROVIDER=nominatim \
    BETA_FREE_ACCESS=true \
    REPLIERS_SAMPLE_MODE=false
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-venv chromium fonts-liberation ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci --include=dev
COPY apps/api apps/api
RUN npm run build --workspace=apps/api
COPY services/calc-engine services/calc-engine
RUN python3 -m venv /opt/propscout-python \
    && /opt/propscout-python/bin/pip install --no-cache-dir -r services/calc-engine/requirements.txt
COPY deploy/free-beta/start.py deploy/free-beta/start.py
CMD ["/opt/propscout-python/bin/python", "/app/deploy/free-beta/start.py"]
