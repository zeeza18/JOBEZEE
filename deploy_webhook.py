#!/usr/bin/env python3
"""Tiny deploy webhook — runs on Hetzner host, triggered by GitHub Actions CI."""
import subprocess, json, os
from http.server import HTTPServer, BaseHTTPRequestHandler

SECRET = "0KjGN4CyApHlkxsPpxIG9QlYQfcaZsnQCP2jbA1kKLE"
PG_PASS = "Jobezee_PG_2026!"


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def do_POST(self):
        self.rfile.read(int(self.headers.get("Content-Length", 0)))
        auth = self.headers.get("Authorization", "")
        if auth != f"Bearer {SECRET}":
            self.send_response(401)
            self.end_headers()
            return
        result = subprocess.run(
            f"cd /opt/jobezee && git pull origin main && "
            f"POSTGRES_PASSWORD={PG_PASS} docker compose up -d postgres && "
            f"POSTGRES_PASSWORD={PG_PASS} docker compose up -d --build backend",
            shell=True, capture_output=True, text=True, timeout=600,
        )
        ok = result.returncode == 0
        body = json.dumps({
            "ok": ok,
            "output": (result.stdout + result.stderr)[-1000:],
        }).encode()
        self.send_response(200 if ok else 500)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", len(body))
        self.end_headers()
        self.wfile.write(body)


HTTPServer(("0.0.0.0", 9000), Handler).serve_forever()
