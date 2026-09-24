#!/bin/sh
set -eu

CERT_DIR=/etc/nginx/certs
mkdir -p "$CERT_DIR"

if [ ! -f "$CERT_DIR/cert.pem" ] || [ ! -f "$CERT_DIR/key.pem" ]; then
    openssl req -x509 -nodes -newkey rsa:2048 -days 3650 \
        -keyout "$CERT_DIR/key.pem" \
        -out "$CERT_DIR/cert.pem" \
        -subj "/CN=webminidisc" \
        -addext "subjectAltName=DNS:webminidisc,DNS:localhost,IP:127.0.0.1"
fi

exec nginx -g 'daemon off;'
