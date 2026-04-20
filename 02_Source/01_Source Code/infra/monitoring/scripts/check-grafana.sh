#!/bin/bash
# Kiểm tra trạng thái Grafana stack
# Usage: ./check-grafana.sh [grafana-url]

GRAFANA_URL="${1:-http://localhost:3002}"
AUTH="admin:admin123"

PASS=0
FAIL=0

ok()   { echo "  [OK]   $1"; PASS=$((PASS+1)); }
fail() { echo "  [FAIL] $1"; FAIL=$((FAIL+1)); }

echo "========================================"
echo " Grafana Health Check"
echo " URL : $GRAFANA_URL"
echo "========================================"

# ─── 1. Grafana có đang chạy không ───────────────────────────────────────────
echo ""
echo "[1] Grafana service"

HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$GRAFANA_URL/api/health")

if [ "$HEALTH" = "200" ]; then
  VERSION=$(curl -s "$GRAFANA_URL/api/health" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('version','?'))")
  ok "Grafana đang chạy — version $VERSION"
else
  fail "Grafana không phản hồi (HTTP $HEALTH)"
fi

# ─── 2. Xác thực credentials ─────────────────────────────────────────────────
echo ""
echo "[2] Authentication"

AUTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" -u "$AUTH" "$GRAFANA_URL/api/org")

if [ "$AUTH_CODE" = "200" ]; then
  ORG=$(curl -s -u "$AUTH" "$GRAFANA_URL/api/org" | python3 -c "import sys,json; print(json.load(sys.stdin)['name'])")
  ok "Login thành công — Org: $ORG"
else
  fail "Sai credentials hoặc không có quyền (HTTP $AUTH_CODE)"
fi

# ─── 3. Prometheus datasource đã kết nối chưa ────────────────────────────────
echo ""
echo "[3] Prometheus datasource"

DS_RESPONSE=$(curl -s -u "$AUTH" "$GRAFANA_URL/api/datasources/name/Prometheus")
DS_TYPE=$(echo "$DS_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('type','not_found'))" 2>/dev/null)

if [ "$DS_TYPE" = "prometheus" ]; then
  DS_URL=$(echo "$DS_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['url'])")
  DS_UID=$(echo "$DS_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['uid'])")
  ok "Datasource tồn tại — URL: $DS_URL | UID: $DS_UID"

  # Test kết nối thực sự tới Prometheus
  PROBE=$(curl -s -u "$AUTH" -X POST "$GRAFANA_URL/api/ds/query" \
    -H "Content-Type: application/json" \
    -d "{
      \"queries\": [{
        \"datasource\": {\"uid\": \"$DS_UID\"},
        \"expr\": \"up\",
        \"instant\": true,
        \"refId\": \"A\"
      }],
      \"from\": \"now-1m\",
      \"to\": \"now\"
    }" 2>/dev/null)

  RESULT_COUNT=$(echo "$PROBE" | python3 -c "
import sys, json
try:
  d = json.load(sys.stdin)
  frames = d['results']['A']['frames']
  print(len(frames))
except:
  print(0)
" 2>/dev/null)

  if [ "$RESULT_COUNT" -gt 0 ] 2>/dev/null; then
    ok "Prometheus trả về dữ liệu — $RESULT_COUNT target(s) đang UP"
  else
    fail "Datasource tồn tại nhưng không query được dữ liệu"
  fi
else
  fail "Datasource Prometheus chưa được add"
fi

# ─── 4. Đếm số dashboard ─────────────────────────────────────────────────────
echo ""
echo "[4] Dashboards"

DB_RESPONSE=$(curl -s -u "$AUTH" "$GRAFANA_URL/api/search?type=dash-db&limit=100")
DB_COUNT=$(echo "$DB_RESPONSE" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null)

if [ "$DB_COUNT" -gt 0 ] 2>/dev/null; then
  ok "Có $DB_COUNT dashboard"
  echo ""
  echo "$DB_RESPONSE" | python3 -c "
import sys, json
dashboards = json.load(sys.stdin)
for d in dashboards:
    print(f\"       - [{d['id']}] {d['title']}\")
"
else
  fail "Chưa có dashboard nào"
fi

# ─── 5. Prometheus targets (bonus) ───────────────────────────────────────────
echo ""
echo "[5] Prometheus targets (via Prometheus API)"

PROM_URL="${2:-http://localhost:9090}"
TARGETS=$(curl -s "$PROM_URL/api/v1/targets" 2>/dev/null)
ACTIVE=$(echo "$TARGETS" | python3 -c "
import sys, json
try:
  targets = json.load(sys.stdin)['data']['activeTargets']
  up   = [t for t in targets if t['health'] == 'up']
  down = [t for t in targets if t['health'] != 'up']
  print(f'UP={len(up)} DOWN={len(down)}')
  for t in targets:
    icon = '✓' if t['health'] == 'up' else '✗'
    job  = t['labels'].get('job','?')
    inst = t['labels'].get('instance','?')
    print(f'       {icon} {job} ({inst})')
except Exception as e:
  print('cannot reach prometheus')
" 2>/dev/null)

if echo "$ACTIVE" | grep -q "UP="; then
  UP_COUNT=$(echo "$ACTIVE" | grep -o 'UP=[0-9]*' | cut -d= -f2)
  DN_COUNT=$(echo "$ACTIVE" | grep -o 'DOWN=[0-9]*' | cut -d= -f2)
  if [ "$DN_COUNT" = "0" ]; then
    ok "Tất cả targets UP ($UP_COUNT/$((UP_COUNT+DN_COUNT)))"
  else
    fail "$DN_COUNT target(s) DOWN"
  fi
  echo "$ACTIVE" | tail -n +2
else
  fail "Không kết nối được Prometheus tại $PROM_URL"
fi

# ─── Summary ─────────────────────────────────────────────────────────────────
echo ""
echo "========================================"
echo " Kết quả: $PASS passed / $((PASS+FAIL)) checks"
echo "========================================"
[ $FAIL -eq 0 ] && exit 0 || exit 1
