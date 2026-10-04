#!/usr/bin/env bash
# Verifies sandbox credentials and lists disputes. Reads .env.local.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env.local; set +a

TOKEN=$(curl -s "$PAYPAL_API_BASE/v1/oauth2/token" \
  -u "$PAYPAL_CLIENT_ID:$PAYPAL_CLIENT_SECRET" \
  -d "grant_type=client_credentials" | python3 -c 'import sys,json; print(json.load(sys.stdin)["access_token"])')
echo "Auth OK"

curl -s "$PAYPAL_API_BASE/v1/customer/disputes" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
