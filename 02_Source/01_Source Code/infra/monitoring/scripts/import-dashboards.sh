#!/bin/bash
# Import Grafana dashboards from grafana.com
# Usage: ./import-dashboards.sh [grafana-url] [user] [password]

GRAFANA_URL="${1:-http://localhost:3002}"
GRAFANA_USER="${2:-admin}"
GRAFANA_PASS="${3:-admin123}"

# Dashboard IDs cần import
DASHBOARDS=(
  "1860"   # Node Exporter Full      - Linux server metrics
  "14282"  # Cadvisor Exporter       - Docker container metrics
  "2583"   # MongoDB                 - MongoDB metrics
)

echo "Importing dashboards to $GRAFANA_URL ..."
echo ""

# Lấy datasource uid của Prometheus
DS_RESPONSE=$(curl -s -u "$GRAFANA_USER:$GRAFANA_PASS" "$GRAFANA_URL/api/datasources/name/Prometheus")
DS_UID=$(echo "$DS_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['uid'])" 2>/dev/null)

if [ -z "$DS_UID" ]; then
  echo "[ERROR] Không tìm thấy datasource Prometheus. Hãy add datasource trước."
  exit 1
fi

echo "Prometheus datasource UID: $DS_UID"
echo ""

for ID in "${DASHBOARDS[@]}"; do
  echo "Importing dashboard ID: $ID ..."

  # Tải dashboard JSON từ grafana.com
  DASHBOARD_JSON=$(curl -s "https://grafana.com/api/dashboards/$ID/revisions/latest/download")

  if [ -z "$DASHBOARD_JSON" ]; then
    echo "  [SKIP] Không tải được dashboard $ID"
    continue
  fi

  # Thay thế datasource placeholder bằng UID thực
  DASHBOARD_JSON=$(echo "$DASHBOARD_JSON" | sed 's/${DS_PROMETHEUS}/'"$DS_UID"'/g')
  DASHBOARD_JSON=$(echo "$DASHBOARD_JSON" | sed 's/\${datasource}/'"$DS_UID"'/g')

  # Import vào Grafana
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

  RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -u "$GRAFANA_USER:$GRAFANA_PASS" \
    -d "$PAYLOAD" \
    "$GRAFANA_URL/api/dashboards/import")

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
