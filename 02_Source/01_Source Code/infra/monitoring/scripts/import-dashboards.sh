#!/bin/bash
# ==============================================================================
# SCRIPT: IMPORT DASHBOARDS TỪ GRAFANA.COM VÀO GRAFANA LOCAL
# ==============================================================================
# Mục đích: Tự động tải và cài đặt các dashboard có sẵn từ Grafana.com
#            vào Grafana instance đang chạy
#
# Các dashboard được import:
#   - ID 1860:  Node Exporter Full (giám sát hệ thống Linux/Windows)
#   - ID 14282: cAdvisor Exporter (giám sát Docker containers)
#   - ID 2583:  MongoDB Exporter (giám sát MongoDB)
#
# Cách dùng:
#   ./import-dashboards.sh [grafana_url] [username] [password]
#   Ví dụ: ./import-dashboards.sh http://localhost:3002 admin admin123
#
# Yêu cầu: curl, python3 (để parse JSON), Grafana đang chạy
# ==============================================================================

# Tham số kết nối Grafana (có giá trị mặc định)
GRAFANA_URL="${1:-http://localhost:3002}"    # URL Grafana (mặc định localhost:3002)
GRAFANA_USER="${2:-admin}"                    # Username (mặc định: admin)
GRAFANA_PASS="${3:-admin123}"                # Password (mặc định: admin123)

# ==============================================================================
# DANH SÁCH DASHBOARD CẦN IMPORT
# ------------------------------------------------------------------------------
# Mỗi ID tương ứng với một dashboard trên Grafana.com/dashboards
# - 1860:  Node Exporter Full - Hiển thị CPU, RAM, Disk, Network của host
# - 14282: Cadvisor Exporter - Hiển thị metrics của Docker containers
# - 2583:  MongoDB - Hiển thị metrics kết nối, operations, replication
# ==============================================================================
DASHBOARDS=(
  "1860"   # Node Exporter Full      - Linux server metrics
  "14282"  # Cadvisor Exporter       - Docker container metrics
  "2583"   # MongoDB                 - MongoDB metrics
)

echo "Importing dashboards to $GRAFANA_URL ..."
echo ""

# ==============================================================================
# BƯỚC 1: LẤY PROMETHEUS DATASOURCE UID
# ------------------------------------------------------------------------------
# Grafana cần UID của datasource để gắn vào dashboard
# Truy vấn API: GET /api/datasources/name/Prometheus
# ==============================================================================
DS_RESPONSE=$(curl -s -u "$GRAFANA_USER:$GRAFANA_PASS" "$GRAFANA_URL/api/datasources/name/Prometheus")
DS_UID=$(echo "$DS_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['uid'])" 2>/dev/null)

# Kiểm tra datasource tồn tại
if [ -z "$DS_UID" ]; then
  echo "[ERROR] Không tìm thấy datasource Prometheus. Hãy add datasource trước."
  exit 1
fi

echo "Prometheus datasource UID: $DS_UID"
echo ""

# ==============================================================================
# BƯỚC 2: IMPORT TỪNG DASHBOARD
# ------------------------------------------------------------------------------
# Quy trình:
#   1. Tải JSON dashboard từ grafana.com API
#   2. Thay thế placeholder datasource bằng UID thực của Prometheus
#   3. Gửi POST request tới Grafana API để import
# ==============================================================================
for ID in "${DASHBOARDS[@]}"; do
  echo "Importing dashboard ID: $ID ..."

  # Tải dashboard JSON từ Grafana.com
  DASHBOARD_JSON=$(curl -s "https://grafana.com/api/dashboards/$ID/revisions/latest/download")

  # Kiểm tra tải thành công
  if [ -z "$DASHBOARD_JSON" ]; then
    echo "  [SKIP] Không tải được dashboard $ID"
    continue
  fi

  # ============================================================================
  # THAY THẾ DATASOURCE PLACEHOLDER
  # ----------------------------------------------------------------------------
  # Dashboard từ Grafana.com thường dùng ${DS_PROMETHEUS} hoặc ${datasource}
  # Cần thay bằng UID thực của Prometheus datasource đã tạo
  # ============================================================================
  DASHBOARD_JSON=$(echo "$DASHBOARD_JSON" | sed 's/${DS_PROMETHEUS}/'"$DS_UID"'/g')
  DASHBOARD_JSON=$(echo "$DASHBOARD_JSON" | sed 's/\${datasource}/'"$DS_UID"'/g')

  # ============================================================================
  # CHUẨN BỊ PAYLOAD VÀ GỬI REQUEST IMPORT
  # ----------------------------------------------------------------------------
  # API: POST /api/dashboards/import
  # overwrite: true - ghi đè nếu dashboard đã tồn tại
  # folderId: 0 - lưu vào root folder
  # ============================================================================
  PAYLOAD=$(cat <<EOF
{
  "dashboard": $DASHBOARD_JSON,
  "overwrite": true,
  "inputs": [
    {
      "name": "DS_PROMETHEUS",
      "type": "datasource",
      "pluginId": "prometheus",
      "value": "$DS_UID"
    }
  ],
  "folderId": 0
}
EOF
)

  # Gửi request import tới Grafana
  RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -u "$GRAFANA_USER:$GRAFANA_PASS" \
    -d "$PAYLOAD" \
    "$GRAFANA_URL/api/dashboards/import")

  # Kiểm tra kết quả import
  STATUS=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status','error'))" 2>/dev/null)
  TITLE=$(echo "$RESPONSE"  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('title','?'))"  2>/dev/null)

  if [ "$STATUS" = "success" ]; then
    echo "  [OK] $TITLE"
  else
    echo "  [FAIL] $RESPONSE"
  fi
done

echo ""
echo "Done. Mở $GRAFANA_URL/dashboards để xem."
