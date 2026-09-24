#!/bin/sh
set -eu

UPSTREAM="${DOWNTIFY_UPSTREAM:-http://127.0.0.1:8000}"
UPSTREAM="${UPSTREAM%/}"
MD_UPSTREAM="${MD_LIBRARY_UPSTREAM:-http://192.168.5.3:8475}"
MD_UPSTREAM="${MD_UPSTREAM%/}"
# Escape sed replacement metacharacters so the upstream URLs are inserted literally.
ESCAPED_UPSTREAM=$(printf '%s' "$UPSTREAM" | sed -e 's/[\\&#]/\\&/g')
ESCAPED_MD_UPSTREAM=$(printf '%s' "$MD_UPSTREAM" | sed -e 's/[\\&#]/\\&/g')
sed -e "s#__DOWNTIFY_UPSTREAM__#${ESCAPED_UPSTREAM}#g" \
    -e "s#__MD_LIBRARY_UPSTREAM__#${ESCAPED_MD_UPSTREAM}#g" \
    /etc/nginx/http.d/default.conf.template > /etc/nginx/http.d/default.conf

CERT_DIR=/etc/nginx/certs
mkdir -p "$CERT_DIR"

if [ ! -f "$CERT_DIR/cert.pem" ] || [ ! -f "$CERT_DIR/key.pem" ]; then
    openssl req -x509 -nodes -newkey rsa:2048 -days 3650 \
        -keyout "$CERT_DIR/key.pem" \
        -out "$CERT_DIR/cert.pem" \
        -subj "/CN=webminidisc" \
        -addext "subjectAltName=DNS:webminidisc,DNS:localhost,IP:127.0.0.1"
fi

# The embedded Downtify is a separate process. It is not published on the host.
cd /downtify
python main.py web --host 127.0.0.1 --port 8000 --log-level "${DOWNTIFY_LOG_LEVEL:-info}" &

python - <<'PY'
import json
import os
import sys
import time
import urllib.error
import urllib.request

base = "http://127.0.0.1:8000"
deadline = time.time() + 90
last_error = "not started"
while time.time() < deadline:
    try:
        with urllib.request.urlopen(base + "/api/version", timeout=2) as response:
            response.read()
        break
    except Exception as exc:
        last_error = str(exc)
        time.sleep(0.5)
else:
    sys.stderr.write(f"embedded downtify did not become ready: {last_error}\n")
    sys.exit(1)

marker = "/data/.wmd-format-initialized"
if os.path.exists(marker):
    sys.exit(0)

request = urllib.request.Request(
    base + "/api/settings/update",
    data=json.dumps({"format": "flac"}).encode(),
    headers={"Content-Type": "application/json"},
    method="POST",
)
try:
    with urllib.request.urlopen(request, timeout=15) as response:
        body = json.loads(response.read().decode())
except urllib.error.HTTPError as exc:
    sys.stderr.write(exc.read().decode() or f"settings update failed ({exc.code})\n")
    sys.exit(1)
if body.get("format") != "flac":
    sys.stderr.write("embedded downtify did not accept format flac\n")
    sys.exit(1)
os.makedirs("/data", exist_ok=True)
with open(marker, "w", encoding="utf-8") as handle:
    handle.write("flac\n")
PY

exec nginx -g 'daemon off;'
