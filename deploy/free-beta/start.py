"""Run the two existing runtimes behind one public beta API port."""

import os
from pathlib import Path
import signal
import subprocess
import sys
import time
import urllib.request

root = Path(__file__).resolve().parents[2]
children = []


def shutdown(signum=None, frame=None):
    for child in children:
        if child.poll() is None:
            child.terminate()
    for child in children:
        try:
            child.wait(timeout=10)
        except subprocess.TimeoutExpired:
            child.kill()
    raise SystemExit(0 if signum else 1)


signal.signal(signal.SIGTERM, shutdown)
signal.signal(signal.SIGINT, shutdown)

# Enforce the deployment profile even if a metered key was added by mistake.
os.environ.update(
    {
        "FREE_ONLY_BETA": "true",
        "GEOCODING_PROVIDER": "nominatim",
        "BETA_FREE_ACCESS": "true",
        "REPLIERS_SAMPLE_MODE": "false",
        "CALC_ENGINE_URL": "http://127.0.0.1:8008",
        "SCRAPER_URL": "http://127.0.0.1:8008",
        "DEV_HPI_BENCHMARKS": "false",
    }
)
for key in (
    "ANTHROPIC_API_KEY",
    "MAPBOX_TOKEN",
    "GOOGLE_PLACES_KEY",
    "WALKSCORE_API_KEY",
    "REPLIERS_API_KEY",
    "STRIPE_SECRET_KEY",
):
    os.environ[key] = ""

children.append(
    subprocess.Popen(
        [
            sys.executable,
            "-m",
            "uvicorn",
            "main:app",
            "--host",
            "127.0.0.1",
            "--port",
            "8008",
        ],
        cwd=root / "services/calc-engine",
    )
)

# Do not advertise a healthy Node service before the calculator is ready.
for attempt in range(90):
    if children[0].poll() is not None:
        shutdown()
    try:
        with urllib.request.urlopen(
            "http://127.0.0.1:8008/health", timeout=1
        ) as response:
            if response.status == 200:
                break
    except Exception:
        time.sleep(1)
else:
    shutdown()

children.append(subprocess.Popen(["node", "dist/app.js"], cwd=root / "apps/api"))
while all(child.poll() is None for child in children):
    time.sleep(1)
shutdown()
