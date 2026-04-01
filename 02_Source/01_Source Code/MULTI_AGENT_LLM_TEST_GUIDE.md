# Multi-Agent LLM System - Test & Verification Guide

## System Overview

The inventory management system now uses a **true multi-agent architecture** with LLM integration:

```
┌─────────────────────────────────────────────────────────────┐
│              Supervisor Agent (Router)                       │
│         (Gemini 1.5 Flash - Intent Classification)           │
└─┬─────────────────────────────────────────────────────────────┘
  │
  ├─→ [Intent: inventory_analyst] 
  │   └─→ **InventoryAnalystAgent**
  │       • Query: "Hàng sắp hết hạn"
  │       • Tools: getLotsStatistics, getExpiringSoon, getExpiredLots
  │       • LLM: Generates natural-language responses from DB data
  │       • Output: assistant_reply + agent_profile + table data
  │
  ├─→ [Intent: warehouse_operator]
  │   └─→ **WarehouseOperatorAgent**
  │       • Query: "Tạo lô hàng mới"
  │       • Tools: createLot, generateBarcode, assignWarehouse
  │       • Output: Lot creation confirmations
  │
  └─→ [Intent: qc_compliance_checker]
      └─→ **QcComplianceCheckerAgent**
          • Query: "Kết quả kiểm tra QC"
          • Tools: submitDecision, getDashboardKPI, getSupplierPerformance
          • Output: QC compliance reports

```

## Architecture Characteristics

✅ **True Multi-Agent System**: 3 specialized agents handling different domains
✅ **Supervisor Pattern**: Intent-based routing using rule + Gemini fallback
✅ **LLM Integration**: Each agent can generate natural-language responses
✅ **Agent Metadata**: Explicit name, description, instructions, model, tools
✅ **Error Handling**: Comprehensive try-catch with graceful fallbacks
✅ **Database Context**: Agents analyze real inventory data before LLM synthesis

## Test Endpoints

### 1. Health Check (No Auth Required)
**Endpoint**: `GET /ai-agents/health`

Purpose: Verify multi-agent infrastructure is ready

```bash
curl http://localhost:3001/ai-agents/health
```

Expected Response:
```json
{
  "success": true,
  "timestamp": "2026-03-31T05:30:00Z",
  "agents": {
    "supervisor": {
      "name": "Supervisor Agent",
      "status": "ready"
    },
    "inventory_analyst": {
      "name": "Inventory Analyst",
      "tools": ["getLotsStatistics", "getExpiringSoon", "getExpiredLots", "generateReply"],
      "status": "ready"
    },
    "warehouse_operator": {
      "name": "Warehouse Operator",
      "tools": ["createLot", "generateBarcode", "assignWarehouse"],
      "status": "ready"
    },
    "qc_compliance_checker": {
      "name": "QC Compliance Checker",
      "tools": ["submitDecision", "getDashboardKPI", "getSupplierPerformance"],
      "status": "ready"
    }
  },
  "llm": {
    "provider": "Google Gemini",
    "model": "gemini-1.5-flash",
    "status": "configured"
  },
  "architecture": {
    "type": "Multi-Agent System",
    "pattern": "Supervisor + Specialized Agents"
  }
}
```

### 2. Agent Routing with LLM (Auth Required)
**Endpoint**: `POST /ai-agents/route`

Purpose: Execute multi-agent system with LLM synthesis

**Prerequisites**:
- Get auth token from Keycloak login
- Keycloak must be running (docker-compose-keycloak.yml)

**Example Request** (with Bearer token):
```bash
curl -X POST http://localhost:3001/ai-agents/route \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {ACCESS_TOKEN}" \
  -d '{
    "query": "Hàng sắp hết hạn",
    "action": null,
    "payload": {}
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "intent": "inventory_analyst",
    "confidence": 0.95,
    "reason": "Matched inventory analysis keywords.",
    "result": {
      "status": "ok",
      "message": "Inventory analysis generated successfully.",
      "assistant_reply": "Hiện có 2 lô sắp hết hạn và 1 lô đã hết hạn. Vui lòng xem bảng danh sách để xử lý. 2 lots are expiring soon and require proactive planning.",
      "agent_profile": {
        "name": "Inventory Analyst",
        "description": "Phân tích tồn kho...",
        "instructions": ["Trả lời bằng tiếng Việt..."],
        "model": "gemini-1.5-flash",
        "tools": [
          "InventoryLotService.getLotsStatistics",
          "InventoryLotService.getExpiringSoon",
          "InventoryLotService.getExpiredLots",
          "InventoryTransactionService.getAll",
          "AgentLlmService.generateReply"
        ]
      },
      "data": {
        "lots": {
          "total": 10,
          "byStatus": { "Quarantine": 2, "Accepted": 8 },
          "expiringSoon": 2,
          "expired": 1
        },
        "expiringLots": [...],
        "expiredLots": [...]
      }
    },
    "timestamp": "2026-03-31T05:35:00Z"
  }
}
```

## How to Get Auth Token

### Option 1: Login via Backend Endpoint
```bash
# Step 1: Login (Keycloak must be running)
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin_manager",
    "password": "Admin@123456"
  }'

# Response will contain:
# - access_token (use this in Authorization header)
# - refresh_token
# - expires_in: 900 seconds (15 minutes)

# Example token response:
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "...",
    "expires_in": 900,
    "token_type": "Bearer"
  }
}
```

### Default Keycloak Users
From `database/realm-export.json`:
- **admin_manager** / Admin@123456 (Manager role - full access)
- **admin_operator** / Admin@123456 (Operator role)
- **admin_qc** / Admin@123456 (QC Technician role)

## Debugging Checklist

### If "No response from server" error:

1. ✅ **Verify Keycloak is running**
   ```bash
   docker ps | grep keycloak
   # Should show: inventory_keycloak  (...) Up X minutes
   
   # If not running, start it:
   docker-compose -f docker-compose-keycloak.yml up -d
   ```

2. ✅ **Verify Backend is running**
   ```bash
   # Check if port 3001 is listening
   netstat -ano | findstr :3001
   
   # If not, start backend:
   cd backend && npm run start:dev
   ```

3. ✅ **Verify MongoDB is connected**
   ```bash
   docker ps | grep inventory_mongo
   # Should show healthy
   ```

4. ✅ **Check auth token validity**
   - Tokens expire in 900 seconds (15 minutes)
   - If expired, login again to get fresh token

5. ✅ **Verify LLM API key**
   ```bash
   # Check backend .env
   cat backend/.env | grep GOOGLE_API_KEY
   # Should be non-empty
   ```

6. ✅ **Check backend logs**
   ```bash
   # Terminal where backend is running should show:
   # ✓ No TypeScript compilation errors
   # ✓ Database connections established
   # ✓ [NestFactory] Starting Nest application...
   ```

## Agent Flow Verification

### Query: "Hàng sắp hết hạn"

1. **Supervisor Intent Classification**
   - Input: Query in Vietnamese
   - Rule-based check: Matches keywords "sắp hết hạn" → high confidence
   - Routing: Dispatches to **InventoryAnalystAgent**

2. **InventoryAnalystAgent.handle()**
   - Calls: `getLotsStatistics()` → Returns lot counts by status
   - Calls: `getExpiringSoon(30)` → Returns lots expiring within 30 days
   - Calls: `getExpiredLots()` → Returns expired lots
   - Builds context from DB data

3. **LLM Generation**
   - Input: Agent profile + user query + DB context
   - Process: Calls Gemini 1.5 Flash API
   - Output: Natural-language Vietnamese response
   - Fallback: If LLM fails, uses template-based reply

4. **Response Generation**
   - Returns: `agent_profile` + `assistant_reply` + table data
   - Frontend: Displays reply, then renders lot table

## Frontend Integration

### Widget Behavior

File: `frontend/src/components/assistant/MyAssistantWidget.tsx`

1. User clicks "Hàng sắp hết hạn" quick suggestion
2. Calls `routeAgent({ query: "Hàng sắp hết hạn" })`
3. Backend processes and returns response with:
   - `assistant_reply`: LLM-generated text
   - `expiringLots` / `expiredLots`: Table data
   - `agent_profile`: Agent metadata
4. Widget displays:
   - Chat message: `assistant_reply`
   - Table: Lot details (if any lots found)

### Error Handling

If endpoint returns error status or times out:
```javascript
catch (error) {
  // Shows: "Hiện tại tôi chưa thể phản hồi: {error message}"
  // Example: "No response from server. Please check internet connection."
}
```

## Performance Notes

- **LLM timeout**: 10 seconds (Gemini default)
- **Token lifetime**: 900 seconds (15 minutes)
- **Database queries**: Cached within same request
- **Multi-parallel**: Supervisor + Agent run in sequence (not parallel)

## Future Enhancements

- ⚠️ Add caching for supervisor intent decisions
- ⚠️ Implement request/response logging
- ⚠️ Add rate limiting for LLM calls
- ⚠️ Support streaming responses for long-running agents
- ⚠️ Add cost tracking for LLM API calls

