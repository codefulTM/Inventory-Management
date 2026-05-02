#!/bin/bash
# ==============================================================================
# SCRIPT: KIỂM TRA SỨC KHỎE CỦA GRAFANA MONITORING STACK
# ==============================================================================
# Mục đích: Kiểm tra toàn diện trạng thái của hệ thống giám sát
#            bao gồm Grafana, Prometheus datasource, Dashboards và Targets
#
# Các bước kiểm tra:
#   1. Grafana service có đang chạy không
#   2. Xác thực credentials (đăng nhập thành công không)
#   3. Prometheus datasource đã kết nối và query được dữ liệu chưa
#   4. Đếm số dashboard hiện có
#   5. Kiểm tra trạng thái các Prometheus targets (UP/DOWN)
#
# Cách dùng:
#   ./check-grafana.sh [grafana_url] [prometheus_url]
#   Ví dụ: ./check-grafana.sh http://localhost:3002 http://localhost:9090
#
# Yêu cầu: curl, python3 (để parse JSON)
# ==============================================================================

# Tham số kết nối
GRAFANA_URL="${1:-http://localhost:3002}"   # URL Grafana (mặc định: localhost:3002)
AUTH="admin:admin123"                        # Credentials mặc định

# Biến đếm kết quả
PASS=0   # Số test passed
FAIL=0   # Số test failed

# Các hàm helper để in kết quả
ok()   { echo "  [OK]   $1"; PASS=$((PASS+1)); }
fail() { echo "  [FAIL] $1"; FAIL=$((FAIL+1)); }

# Header
echo "========================================"
echo " Grafana Health Check"
echo " URL : $GRAFANA_URL"
echo "========================================"

# ==============================================================================
# BƯỚC 1: KIỂM TRA GRAFANA SERVICE
# ------------------------------------------------------------------------------
# Gọi API /api/health để kiểm tra Grafana có phản hồi không
# HTTP 200 = OK, ngược lại = FAIL
# ==============================================================================
echo ""
echo "[1] Grafana service"

HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$GRAFANA_URL/api/health")

if [ "$HEALTH" = "200" ]; then
  VERSION=$(curl -s "$GRAFANA_URL/api/health" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('version','?'))")
  ok "Grafana đang chạy — version $VERSION"
else
  fail "Grafana không phản hồi (HTTP $HEALTH)"
fi

# ==============================================================================
# BƯỚC 2: KIỂM TRA XÁC THỰC (AUTHENTICATION)
# ------------------------------------------------------------------------------
# Thử đăng nhập vào tổ chức (org) bằng credentials đã cấu hình
# Kiểm tra API /api/org có trả về thông tin tổ chức không
# ==============================================================================
echo ""
echo "[2] Authentication"

AUTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" -u "$AUTH" "$GRAFANA_URL/api/org")

if [ "$AUTH_CODE" = "200" ]; then
  ORG=$(curl -s -u "$AUTH" "$GRAFANA_URL/api/org" | python3 -c "import sys,json; print(json.load(sys.stdin)['name'])")
  ok "Login thành công — Org: $ORG"
else
  fail "Sai credentials hoặc không có quyền (HTTP $AUTH_CODE)"
fi

# ==============================================================================
# BƯỚC 3: KIỂM TRA PROMETHEUS DATASOURCE
# ------------------------------------------------------------------------------
# 3.1. Kiểm tra datasource có tồn tại không (GET /api/datasources/name/Prometheus)
# 3.2. Test query thực tế để đảm bảo datasource kết nối được tới Prometheus
# ==============================================================================
echo ""
echo "[3] Prometheus datasource"

DS_RESPONSE=$(curl -s -u "$AUTH" "$GRAFANA_URL/api/datasources/name/Prometheus")
DS_TYPE=$(echo "$DS_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('type','not_found'))" 2>/dev/null)

if [ "$DS_TYPE" = "prometheus" ]; then
  DS_URL=$(echo "$DS_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['url'])")
  DS_UID=$(echo "$DS_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['uid'])")
  ok "Datasource tồn tại — URL: $DS_URL | UID: $DS_UID"

  # ============================================================================
  # TEST QUERY THỰC TẾ
  # ----------------------------------------------------------------------------
  # Gửi query đơn giản "up" để kiểm tra Prometheus có trả về dữ liệu không
  # Kết quả > 0 nghĩa là có ít nhất 1 target đang UP
  # ============================================================================
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

# ==============================================================================
# BƯỚC 4: ĐẾM SỐ DASHBOARD
# ------------------------------------------------------------------------------
# Gọi API /api/search để lấy danh sách tất cả dashboards
# Hiển thị số lượng và tên từng dashboard
# ==============================================================================
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

# ==============================================================================
# BƯỚC 5: KIỂM TRA PROMETHEUS TARGETS
# ------------------------------------------------------------------------------
# Gọi Prometheus API /api/v1/targets để lấy trạng thái các scrape targets
# Phân loại: UP (xanh) và DOWN (đỏ)
# Hiển thị chi tiết từng target với job name và instance
# ==============================================================================
echo ""
echo "[5] Prometheus targets (via Prometheus API)"

PROM_URL="${2:-http://localhost:9090}"   # Prometheus URL (tham số thứ 2)
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

# Kiểm tra và hiển thị kết quả targets
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

# ==============================================================================
# TỔNG KẾT
# ------------------------------------------------------------------------------
# Hiển thị số test passed/failed
# Exit code: 0 nếu tất cả pass, 1 nếu có bất kỳ fail nào
# ==============================================================================
echo ""
echo "========================================"
echo " Kết quả: $PASS passed / $((PASS+FAIL)) checks"
echo "========================================"
[ $FAIL -eq 0 ] && exit 0 || exit 1
