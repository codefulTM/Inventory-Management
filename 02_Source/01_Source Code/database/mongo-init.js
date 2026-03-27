/**
 * MongoDB Initialization Script: Pharmacy Inventory Management System
 * Purpose: Initialize collections with comprehensive seed data (20+ records each)
 * Date: 2026-03-15
 * 
 * Collections:
 * - users (20 users)
 * - materials (25 materials)
 * - inventory_lots (30 lots)
 * - inventory_transactions (35 transactions)
 * - production_batches (25 batches)
 * - batch_components (30 components)
 * - qc_tests (30 tests)
 */

// ============================================================================
// 1. CONNECT & INITIALIZE DATABASE
// ============================================================================

db = db.getSiblingDB("inventory");
db.dropDatabase();
print(">>> Database 'inventory' initialized");


// ============================================================================
// 2. CREATE COLLECTIONS WITH SCHEMA VALIDATION
// ============================================================================

// Users Collection
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["user_id", "username", "email", "role"],
      properties: {
        user_id: { bsonType: "string" },
        username: { bsonType: "string" },
        email: { bsonType: "string" },
        role: { bsonType: "string", enum: ["Manager", "Operator", "Quality Control Technician", "IT Administrator"] },
        is_active: { bsonType: "bool" },
        last_login: { bsonType: ["date", "null"] },
        created_date: { bsonType: "date" },
        modified_date: { bsonType: "date" }
      }
    }
  }
});

// Materials Collection
db.createCollection("materials", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["material_id", "part_number", "material_name", "material_type", "status"],
      properties: {
        material_id: { bsonType: "string" },
        part_number: { bsonType: "string" },
        material_name: { bsonType: "string" },
        material_type: { bsonType: "string" },
        storage_conditions: { bsonType: ["string", "null"] },
        specification_document: { bsonType: ["string", "null"] },
        created_by: { bsonType: ["string", "null"] },
        approved_by: { bsonType: ["string", "null"] },
        status: { bsonType: "string", enum: ["Pending", "Approved", "Rejected"] },
        created_date: { bsonType: "date" },
        modified_date: { bsonType: "date" }
      }
    }
  }
});

// Inventory Lots Collection
db.createCollection("inventory_lots", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["lot_id", "material_id", "manufacturer_name", "manufacturer_lot", "received_date", "expiration_date", "status", "quantity", "unit_of_measure"],
      properties: {
        lot_id: { bsonType: "string" },
        material_id: { bsonType: "string" },
        manufacturer_name: { bsonType: "string" },
        manufacturer_lot: { bsonType: "string" },
        supplier_name: { bsonType: ["string", "null"] },
        received_date: { bsonType: "date" },
        expiration_date: { bsonType: "date" },
        in_use_expiration_date: { bsonType: ["date", "null"] },
        status: { bsonType: "string", enum: ["Quarantine", "Accepted", "Rejected", "Depleted"] },
        quantity: { bsonType: "int" },
        unit_of_measure: { bsonType: "string" },
        storage_location: { bsonType: ["string", "null"] },
        is_sample: { bsonType: "bool" },
        parent_lot_id: { bsonType: ["string", "null"] },
        notes: { bsonType: ["string", "null"] },
        received_by: { bsonType: ["string", "null"] },
        qc_by: { bsonType: ["string", "null"] },
        history: { bsonType: ["array", "null"] },
        created_date: { bsonType: "date" },
        modified_date: { bsonType: "date" }
      }
    }
  }
});

// Inventory Transactions Collection
db.createCollection("inventory_transactions", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["transaction_id", "lot_id", "transaction_type", "quantity", "unit_of_measure", "transaction_date", "performed_by"],
      properties: {
        transaction_id: { bsonType: "string" },
        lot_id: { bsonType: "string" },
        related_lot_id: { bsonType: ["string", "null"] },
        transaction_type: { bsonType: "string", enum: ["Receipt", "Usage", "Split", "Adjustment", "Transfer", "Disposal"] },
        quantity: { bsonType: "string" },
        unit_of_measure: { bsonType: "string" },
        transaction_date: { bsonType: "date" },
        reference_number: { bsonType: ["string", "null"] },
        performed_by: { bsonType: "string" },
        notes: { bsonType: ["string", "null"] },
        created_date: { bsonType: "date" },
        modified_date: { bsonType: "date" }
      }
    }
  }
});

// Production Batches Collection
db.createCollection("production_batches", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["batch_id", "product_id", "batch_number", "unit_of_measure", "shelf_life_value", "shelf_life_unit", "status", "batch_size"],
      properties: {
        batch_id: { bsonType: "string" },
        product_id: { bsonType: "string" },
        batch_number: { bsonType: "string" },
        unit_of_measure: { bsonType: "string" },
        shelf_life_value: { bsonType: "int" },
        shelf_life_unit: { bsonType: "string" },
        status: { bsonType: "string", enum: ["In Progress", "Complete", "On Hold", "Cancelled"] },
        batch_size: { bsonType: "decimal" },
        created_by: { bsonType: ["string", "null"] },
        approved_by: { bsonType: ["string", "null"] },
        completed_by: { bsonType: ["string", "null"] },
        created_date: { bsonType: "date" },
        modified_date: { bsonType: "date" }
      }
    }
  }
});

// Batch Components Collection
db.createCollection("batch_components", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["component_id", "batch_id", "lot_id", "planned_quantity", "unit_of_measure"],
      properties: {
        component_id: { bsonType: "string" },
        batch_id: { bsonType: "string" },
        lot_id: { bsonType: "string" },
        planned_quantity: { bsonType: "decimal" },
        actual_quantity: { bsonType: ["decimal", "null"] },
        unit_of_measure: { bsonType: "string" },
        addition_date: { bsonType: ["date", "null"] },
        added_by: { bsonType: ["string", "null"] },
        created_date: { bsonType: "date" },
        modified_date: { bsonType: "date" }
      }
    }
  }
});

// QC Tests Collection
db.createCollection("qc_tests", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["test_id", "lot_id", "test_type", "test_method", "test_date", "test_result", "result_status", "performed_by"],
      properties: {
        test_id: { bsonType: "string" },
        lot_id: { bsonType: "string" },
        test_type: { bsonType: "string", enum: ["Identity", "Potency", "Microbial", "Growth Promotion", "Physical", "Chemical"] },
        test_method: { bsonType: "string" },
        test_date: { bsonType: "date" },
        test_result: { bsonType: "string" },
        acceptance_criteria: { bsonType: ["string", "null"] },
        result_status: { bsonType: "string", enum: ["Pass", "Fail", "Pending"] },
        performed_by: { bsonType: "string" },
        verified_by: { bsonType: ["string", "null"] },
        reject_reason: { bsonType: ["string", "null"] },
        retry_count: { bsonType: ["int", "null"] },
        created_date: { bsonType: "date" },
        modified_date: { bsonType: "date" }
      }
    }
  }
});

print(">>> All collections created successfully");


// ============================================================================
// 3. CREATE INDEXES FOR PERFORMANCE
// ============================================================================

db.users.createIndex({ username: 1 }, { unique: true });
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });
db.users.createIndex({ is_active: 1 });

db.materials.createIndex({ material_id: 1 }, { unique: true });
db.materials.createIndex({ part_number: 1 }, { unique: true });
db.materials.createIndex({ material_type: 1 });
db.materials.createIndex({ status: 1 });
db.materials.createIndex({ material_name: "text" });

db.inventory_lots.createIndex({ lot_id: 1 }, { unique: true });
db.inventory_lots.createIndex({ material_id: 1 });
db.inventory_lots.createIndex({ status: 1 });
db.inventory_lots.createIndex({ expiration_date: 1 });
db.inventory_lots.createIndex({ is_sample: 1 });
db.inventory_lots.createIndex({ material_id: 1, status: 1 });

db.inventory_transactions.createIndex({ transaction_id: 1 }, { unique: true });
db.inventory_transactions.createIndex({ lot_id: 1 });
db.inventory_transactions.createIndex({ transaction_type: 1 });
db.inventory_transactions.createIndex({ transaction_date: -1 });
db.inventory_transactions.createIndex({ performed_by: 1 });

db.production_batches.createIndex({ batch_id: 1 }, { unique: true });
db.production_batches.createIndex({ batch_number: 1 }, { unique: true });
db.production_batches.createIndex({ product_id: 1 });
db.production_batches.createIndex({ status: 1 });

db.batch_components.createIndex({ component_id: 1 }, { unique: true });
db.batch_components.createIndex({ batch_id: 1 });
db.batch_components.createIndex({ lot_id: 1 });

db.qc_tests.createIndex({ test_id: 1 }, { unique: true });
db.qc_tests.createIndex({ lot_id: 1 });
db.qc_tests.createIndex({ result_status: 1 });
db.qc_tests.createIndex({ test_date: -1 });

print(">>> All indexes created successfully");


// ============================================================================
// 4. INSERT SEED DATA
// ============================================================================

// ---- USERS (20 users) ----
db.users.insertMany([
  { user_id: "USR-001", username: "admin_pharmacy", email: "admin@pharmacy.com", role: "IT Administrator", is_active: true, last_login: new Date("2026-03-15T08:00:00Z"), created_date: new Date("2025-01-01"), modified_date: new Date("2026-03-15") },
  { user_id: "USR-002", username: "manager_inventory", email: "manager.inv@pharmacy.com", role: "Manager", is_active: true, last_login: new Date("2026-03-15T09:30:00Z"), created_date: new Date("2025-01-05"), modified_date: new Date("2026-03-15") },
  { user_id: "USR-003", username: "manager_production", email: "manager.prod@pharmacy.com", role: "Manager", is_active: true, last_login: new Date("2026-03-14T14:15:00Z"), created_date: new Date("2025-01-10"), modified_date: new Date("2026-03-15") },
  { user_id: "USR-004", username: "operator_batch1", email: "operator1@pharmacy.com", role: "Operator", is_active: true, last_login: new Date("2026-03-15T07:45:00Z"), created_date: new Date("2025-02-01"), modified_date: new Date("2026-03-15") },
  { user_id: "USR-005", username: "operator_batch2", email: "operator2@pharmacy.com", role: "Operator", is_active: true, last_login: new Date("2026-03-15T08:20:00Z"), created_date: new Date("2025-02-05"), modified_date: new Date("2026-03-15") },
  { user_id: "USR-006", username: "operator_batch3", email: "operator3@pharmacy.com", role: "Operator", is_active: true, last_login: new Date("2026-03-14T16:00:00Z"), created_date: new Date("2025-02-10"), modified_date: new Date("2026-03-15") },
  { user_id: "USR-007", username: "qc_technician1", email: "qc1@pharmacy.com", role: "Quality Control Technician", is_active: true, last_login: new Date("2026-03-15T10:30:00Z"), created_date: new Date("2025-02-15"), modified_date: new Date("2026-03-15") },
  { user_id: "USR-008", username: "qc_technician2", email: "qc2@pharmacy.com", role: "Quality Control Technician", is_active: true, last_login: new Date("2026-03-15T11:00:00Z"), created_date: new Date("2025-02-20"), modified_date: new Date("2026-03-15") },
  { user_id: "USR-009", username: "qc_technician3", email: "qc3@pharmacy.com", role: "Quality Control Technician", is_active: true, last_login: new Date("2026-03-14T09:15:00Z"), created_date: new Date("2025-02-25"), modified_date: new Date("2026-03-15") },
  { user_id: "USR-010", username: "qc_technician4", email: "qc4@pharmacy.com", role: "Quality Control Technician", is_active: false, last_login: new Date("2026-02-20T15:30:00Z"), created_date: new Date("2025-03-01"), modified_date: new Date("2026-03-15") },
  { user_id: "USR-011", username: "operator_batch4", email: "operator4@pharmacy.com", role: "Operator", is_active: true, last_login: new Date("2026-03-15T06:00:00Z"), created_date: new Date("2025-03-05"), modified_date: new Date("2026-03-15") },
  { user_id: "USR-012", username: "operator_batch5", email: "operator5@pharmacy.com", role: "Operator", is_active: true, last_login: new Date("2026-03-15T17:45:00Z"), created_date: new Date("2025-03-10"), modified_date: new Date("2026-03-15") },
  { user_id: "USR-013", username: "manager_quality", email: "manager.qc@pharmacy.com", role: "Manager", is_active: true, last_login: new Date("2026-03-15T12:00:00Z"), created_date: new Date("2025-03-15"), modified_date: new Date("2026-03-15") },
  { user_id: "USR-014", username: "qc_technician5", email: "qc5@pharmacy.com", role: "Quality Control Technician", is_active: true, last_login: new Date("2026-03-14T13:20:00Z"), created_date: new Date("2025-03-20"), modified_date: new Date("2026-03-15") },
  { user_id: "USR-015", username: "operator_batch6", email: "operator6@pharmacy.com", role: "Operator", is_active: true, last_login: new Date("2026-03-15T18:30:00Z"), created_date: new Date("2025-03-25"), modified_date: new Date("2026-03-15") },
  { user_id: "USR-016", username: "admin_system", email: "sysadmin@pharmacy.com", role: "IT Administrator", is_active: true, last_login: new Date("2026-03-15T08:15:00Z"), created_date: new Date("2025-04-01"), modified_date: new Date("2026-03-15") },
  { user_id: "USR-017", username: "operator_batch7", email: "operator7@pharmacy.com", role: "Operator", is_active: true, last_login: new Date("2026-03-15T07:00:00Z"), created_date: new Date("2025-04-05"), modified_date: new Date("2026-03-15") },
  { user_id: "USR-018", username: "qc_technician6", email: "qc6@pharmacy.com", role: "Quality Control Technician", is_active: true, last_login: new Date("2026-03-15T11:45:00Z"), created_date: new Date("2025-04-10"), modified_date: new Date("2026-03-15") },
  { user_id: "USR-019", username: "manager_warehouse", email: "manager.wh@pharmacy.com", role: "Manager", is_active: true, last_login: new Date("2026-03-15T09:00:00Z"), created_date: new Date("2025-04-15"), modified_date: new Date("2026-03-15") },
  { user_id: "USR-020", username: "operator_batch8", email: "operator8@pharmacy.com", role: "Operator", is_active: false, last_login: new Date("2026-02-15T10:30:00Z"), created_date: new Date("2025-04-20"), modified_date: new Date("2026-03-15") }
]);


// ---- MATERIALS (25 materials) ----
db.materials.insertMany([
  { material_id: "MAT-001", part_number: "API-100001", material_name: "Vitamin D3 100K IU", material_type: "API", storage_conditions: "2-8°C, dry place, protect from light", specification_document: "SPEC-API-D3-001", created_by: "USR-001", approved_by: "USR-002", status: "Approved", created_date: new Date("2025-01-15"), modified_date: new Date("2026-03-15") },
  { material_id: "MAT-002", part_number: "API-100002", material_name: "Vitamin C 500mg", material_type: "API", storage_conditions: "2-8°C, sealed container", specification_document: "SPEC-API-VC-001", created_by: "USR-001", approved_by: "USR-002", status: "Approved", created_date: new Date("2025-01-20"), modified_date: new Date("2026-03-15") },
  { material_id: "MAT-003", part_number: "EXC-200001", material_name: "Calcium Carbonate 500mg", material_type: "Excipient", storage_conditions: "Room temperature, dry", specification_document: "SPEC-EXC-CA-001", created_by: "USR-001", approved_by: "USR-002", status: "Approved", created_date: new Date("2025-01-25"), modified_date: new Date("2026-03-15") },
  { material_id: "MAT-004", part_number: "API-100003", material_name: "Zinc Gluconate 10mg", material_type: "API", storage_conditions: "Room temperature, sealed", specification_document: "SPEC-API-ZN-001", created_by: "USR-001", approved_by: "USR-002", status: "Approved", created_date: new Date("2025-02-01"), modified_date: new Date("2026-03-15") },
  { material_id: "MAT-005", part_number: "EXC-200002", material_name: "Magnesium Oxide", material_type: "Excipient", storage_conditions: "15-30°C, moisture-free", specification_document: "SPEC-EXC-MG-001", created_by: "USR-001", approved_by: "USR-002", status: "Approved", created_date: new Date("2025-02-05"), modified_date: new Date("2026-03-15") },
  { material_id: "MAT-006", part_number: "CON-300001", material_name: "PET Plastic Bottle 100ml", material_type: "Container", storage_conditions: "Room temperature", specification_document: "SPEC-CON-PET-001", created_by: "USR-001", approved_by: "USR-002", status: "Approved", created_date: new Date("2025-02-10"), modified_date: new Date("2026-03-15") },
  { material_id: "MAT-007", part_number: "CLO-400001", material_name: "HDPE Bottle Plastic Cap", material_type: "Closure", storage_conditions: "Room temperature", specification_document: "SPEC-CLO-HDPE-001", created_by: "USR-001", approved_by: "USR-002", status: "Approved", created_date: new Date("2025-02-15"), modified_date: new Date("2026-03-15") },
  { material_id: "MAT-008", part_number: "API-100004", material_name: "Vitamin B12 1000mcg", material_type: "API", storage_conditions: "2-8°C, protected from light", specification_document: "SPEC-API-B12-001", created_by: "USR-001", approved_by: "USR-002", status: "Approved", created_date: new Date("2025-02-20"), modified_date: new Date("2026-03-15") },
  { material_id: "MAT-009", part_number: "API-100005", material_name: "Iron Gluconate 27mg", material_type: "API", storage_conditions: "15-30°C, sealed", specification_document: "SPEC-API-FE-001", created_by: "USR-001", approved_by: "USR-002", status: "Approved", created_date: new Date("2025-02-25"), modified_date: new Date("2026-03-15") },
  { material_id: "MAT-010", part_number: "EXC-200003", material_name: "Microcrystalline Cellulose", material_type: "Excipient", storage_conditions: "Room temperature, dry", specification_document: "SPEC-EXC-MCC-001", created_by: "USR-001", approved_by: "USR-002", status: "Approved", created_date: new Date("2025-03-01"), modified_date: new Date("2026-03-15") },
  { material_id: "MAT-011", part_number: "API-100006", material_name: "Folic Acid 400mcg", material_type: "API", storage_conditions: "2-8°C, protect from light", specification_document: "SPEC-API-FA-001", created_by: "USR-001", approved_by: "USR-002", status: "Approved", created_date: new Date("2025-03-05"), modified_date: new Date("2026-03-15") },
  { material_id: "MAT-012", part_number: "API-100007", material_name: "Biotin 5mg", material_type: "API", storage_conditions: "2-8°C, sealed container", specification_document: "SPEC-API-BT-001", created_by: "USR-001", approved_by: "USR-002", status: "Approved", created_date: new Date("2025-03-10"), modified_date: new Date("2026-03-15") },
  { material_id: "MAT-013", part_number: "EXC-200004", material_name: "Croscarmellose Sodium", material_type: "Excipient", storage_conditions: "Room temperature, dry", specification_document: "SPEC-EXC-CCS-001", created_by: "USR-001", approved_by: "USR-002", status: "Approved", created_date: new Date("2025-03-15"), modified_date: new Date("2026-03-15") },
  { material_id: "MAT-014", part_number: "CON-300002", material_name: "Aluminum Blister Pack", material_type: "Container", storage_conditions: "Room temperature", specification_document: "SPEC-CON-AL-001", created_by: "USR-001", approved_by: "USR-002", status: "Approved", created_date: new Date("2025-03-20"), modified_date: new Date("2026-03-15") },
  { material_id: "MAT-015", part_number: "API-100008", material_name: "Selenium Selenite 100mcg", material_type: "API", storage_conditions: "2-8°C, sealed", specification_document: "SPEC-API-SE-001", created_by: "USR-001", approved_by: "USR-002", status: "Approved", created_date: new Date("2025-03-25"), modified_date: new Date("2026-03-15") },
  { material_id: "MAT-016", part_number: "API-100009", material_name: "Copper Gluconate 5mg", material_type: "API", storage_conditions: "Room temperature, sealed", specification_document: "SPEC-API-CU-001", created_by: "USR-001", approved_by: "USR-002", status: "Approved", created_date: new Date("2025-04-01"), modified_date: new Date("2026-03-15") },
  { material_id: "MAT-017", part_number: "EXC-200005", material_name: "Magnesium Stearate", material_type: "Excipient", storage_conditions: "Room temperature, dry", specification_document: "SPEC-EXC-MS-001", created_by: "USR-001", approved_by: "USR-002", status: "Approved", created_date: new Date("2025-04-05"), modified_date: new Date("2026-03-15") },
  { material_id: "MAT-018", part_number: "CLO-400002", material_name: "Desiccant Silica Gel Packet", material_type: "Closure", storage_conditions: "Room temperature, sealed", specification_document: "SPEC-CLO-SG-001", created_by: "USR-001", approved_by: "USR-002", status: "Approved", created_date: new Date("2025-04-10"), modified_date: new Date("2026-03-15") },
  { material_id: "MAT-019", part_number: "API-100010", material_name: "Iodine 150mcg", material_type: "API", storage_conditions: "2-8°C, sealed container", specification_document: "SPEC-API-I-001", created_by: "USR-001", approved_by: "USR-002", status: "Approved", created_date: new Date("2025-04-15"), modified_date: new Date("2026-03-15") },
  { material_id: "MAT-020", part_number: "EXC-200006", material_name: "Mannitol Powder", material_type: "Excipient", storage_conditions: "Room temperature, dry", specification_document: "SPEC-EXC-MAN-001", created_by: "USR-001", approved_by: "USR-002", status: "Approved", created_date: new Date("2025-04-20"), modified_date: new Date("2026-03-15") },
  { material_id: "MAT-021", part_number: "API-100011", material_name: "Chromium Picolinate 100mcg", material_type: "API", storage_conditions: "Room temperature, sealed", specification_document: "SPEC-API-CR-001", created_by: "USR-001", approved_by: "USR-002", status: "Approved", created_date: new Date("2025-04-25"), modified_date: new Date("2026-03-15") },
  { material_id: "MAT-022", part_number: "CON-300003", material_name: "Cardboard Box Packaging", material_type: "Container", storage_conditions: "Room temperature", specification_document: "SPEC-CON-BOX-001", created_by: "USR-001", approved_by: "USR-002", status: "Approved", created_date: new Date("2025-05-01"), modified_date: new Date("2026-03-15") },
  { material_id: "MAT-023", part_number: "PROD-500001", material_name: "Multivitamin Supplement Caplet", material_type: "Dietary Supplement", storage_conditions: "15-30°C, dry place", specification_document: "SPEC-PROD-MULTI-001", created_by: "USR-001", approved_by: "USR-002", status: "Approved", created_date: new Date("2025-05-05"), modified_date: new Date("2026-03-15") },
  { material_id: "MAT-024", part_number: "PROD-500002", material_name: "Women's Health Capsule", material_type: "Dietary Supplement", storage_conditions: "15-30°C, dry place", specification_document: "SPEC-PROD-WH-001", created_by: "USR-001", approved_by: "USR-002", status: "Approved", created_date: new Date("2025-05-10"), modified_date: new Date("2026-03-15") },
  { material_id: "MAT-025", part_number: "PROD-500003", material_name: "Immune Boost Tablet", material_type: "Dietary Supplement", storage_conditions: "15-30°C, dry place", specification_document: "SPEC-PROD-IMMUNE-001", created_by: "USR-001", approved_by: "USR-002", status: "Approved", created_date: new Date("2025-05-15"), modified_date: new Date("2026-03-15") }
]);


// ---- INVENTORY LOTS (30 lots) ----
db.inventory_lots.insertMany([
  { lot_id: "LOT-001", material_id: "MAT-001", manufacturer_name: "Global Pharma Ltd", manufacturer_lot: "GLP-D3-2025-001", supplier_name: "Premium Suppliers Inc", received_date: new Date("2026-01-10"), expiration_date: new Date("2028-01-10"), in_use_expiration_date: new Date("2027-07-10"), status: "Accepted", quantity: 5000, unit_of_measure: "capsule", storage_location: "COLD-STORE-A1", is_sample: false, parent_lot_id: null, notes: "High purity, certified batch", received_by: "USR-004", qc_by: "USR-007", history: [], created_date: new Date("2026-01-10"), modified_date: new Date("2026-03-15") },
  { lot_id: "LOT-002", material_id: "MAT-001", manufacturer_name: "Global Pharma Ltd", manufacturer_lot: "GLP-D3-2025-001", supplier_name: "Premium Suppliers Inc", received_date: new Date("2026-01-10"), expiration_date: new Date("2028-01-10"), status: "Quarantine", quantity: 100, unit_of_measure: "capsule", storage_location: "QC-LAB-B2", is_sample: true, parent_lot_id: "LOT-001", notes: "QC sample for testing", received_by: "USR-004", qc_by: null, history: [], created_date: new Date("2026-01-10"), modified_date: new Date("2026-03-15") },
  { lot_id: "LOT-003", material_id: "MAT-002", manufacturer_name: "BioVitamin Corp", manufacturer_lot: "BVC-VC-2025-156", supplier_name: "Asia Pharma Distribution", received_date: new Date("2026-01-15"), expiration_date: new Date("2027-01-15"), in_use_expiration_date: new Date("2026-07-15"), status: "Accepted", quantity: 3000, unit_of_measure: "capsule", storage_location: "COLD-STORE-A2", is_sample: false, parent_lot_id: null, notes: "Powder form, properly sealed", received_by: "USR-005", qc_by: "USR-008", history: [], created_date: new Date("2026-01-15"), modified_date: new Date("2026-03-15") },
  { lot_id: "LOT-004", material_id: "MAT-003", manufacturer_name: "ChemTech Industries", manufacturer_lot: "CTI-CA-2025-089", supplier_name: "Industrial Minerals Supply", received_date: new Date("2026-01-20"), expiration_date: new Date("2029-01-20"), status: "Accepted", quantity: 10000, unit_of_measure: "capsule", storage_location: "DRY-STORE-C1", is_sample: false, parent_lot_id: null, notes: "Bulk excipient shipment", received_by: "USR-011", qc_by: "USR-014", history: [], created_date: new Date("2026-01-20"), modified_date: new Date("2026-03-15") },
  { lot_id: "LOT-005", material_id: "MAT-004", manufacturer_name: "Nutrient Plus Corp", manufacturer_lot: "NPC-ZN-2025-042", supplier_name: "Premium Nutrient Supply", received_date: new Date("2026-01-25"), expiration_date: new Date("2027-01-25"), in_use_expiration_date: new Date("2026-12-25"), status: "Accepted", quantity: 2000, unit_of_measure: "capsule", storage_location: "COLD-STORE-B1", is_sample: false, parent_lot_id: null, notes: "API for supplement formulation", received_by: "USR-015", qc_by: "USR-018", history: [], created_date: new Date("2026-01-25"), modified_date: new Date("2026-03-15") },
  { lot_id: "LOT-006", material_id: "MAT-005", manufacturer_name: "ChemTech Industries", manufacturer_lot: "CTI-MG-2025-103", supplier_name: "Industrial Minerals Supply", received_date: new Date("2026-02-01"), expiration_date: new Date("2029-02-01"), status: "Rejected", quantity: 0, unit_of_measure: "capsule", storage_location: "REJECT-BAY-A", is_sample: false, parent_lot_id: null, notes: "Failed moisture test, returned to supplier", received_by: "USR-004", qc_by: "USR-007", history: [], created_date: new Date("2026-02-01"), modified_date: new Date("2026-03-15") },
  { lot_id: "LOT-007", material_id: "MAT-006", manufacturer_name: "PackCo Manufacturing", manufacturer_lot: "PCM-PET-2025-256", supplier_name: "Packaging Solutions Inc", received_date: new Date("2026-02-05"), expiration_date: new Date("2028-02-05"), status: "Accepted", quantity: 50000, unit_of_measure: "piece", storage_location: "PACKAGING-D1", is_sample: false, parent_lot_id: null, notes: "Container bottles for finished products", received_by: "USR-005", qc_by: "USR-008", history: [], created_date: new Date("2026-02-05"), modified_date: new Date("2026-03-15") },
  { lot_id: "LOT-008", material_id: "MAT-007", manufacturer_name: "CapTech Solutions", manufacturer_lot: "CTS-HDPE-2025-418", supplier_name: "Packaging Solutions Inc", received_date: new Date("2026-02-10"), expiration_date: new Date("2028-02-10"), status: "Accepted", quantity: 100000, unit_of_measure: "piece", storage_location: "PACKAGING-D2", is_sample: false, parent_lot_id: null, notes: "Plastic caps for bottles, quality verified", received_by: "USR-011", qc_by: "USR-014", history: [], created_date: new Date("2026-02-10"), modified_date: new Date("2026-03-15") },
  { lot_id: "LOT-009", material_id: "MAT-008", manufacturer_name: "BioVitamin Corp", manufacturer_lot: "BVC-B12-2025-201", supplier_name: "Asia Pharma Distribution", received_date: new Date("2026-02-15"), expiration_date: new Date("2027-02-15"), in_use_expiration_date: new Date("2026-11-15"), status: "Accepted", quantity: 1500, unit_of_measure: "capsule", storage_location: "COLD-STORE-A3", is_sample: false, parent_lot_id: null, notes: "High potency B12 concentrate", received_by: "USR-015", qc_by: "USR-018", history: [], created_date: new Date("2026-02-15"), modified_date: new Date("2026-03-15") },
  { lot_id: "LOT-010", material_id: "MAT-009", manufacturer_name: "Iron Supplements Ltd", manufacturer_lot: "ISL-FE-2025-312", supplier_name: "Premium Suppliers Inc", received_date: new Date("2026-02-20"), expiration_date: new Date("2027-02-20"), in_use_expiration_date: new Date("2026-10-20"), status: "Accepted", quantity: 2500, unit_of_measure: "capsule", storage_location: "COLD-STORE-B2", is_sample: false, parent_lot_id: null, notes: "Iron gluconate for anemia support", received_by: "USR-004", qc_by: "USR-007", history: [], created_date: new Date("2026-02-20"), modified_date: new Date("2026-03-15") },
  { lot_id: "LOT-011", material_id: "MAT-010", manufacturer_name: "Cellulose Corp", manufacturer_lot: "CC-MCC-2025-567", supplier_name: "Chemical Excipients Ltd", received_date: new Date("2026-02-25"), expiration_date: new Date("2028-02-25"), status: "Accepted", quantity: 15000, unit_of_measure: "gram", storage_location: "DRY-STORE-C2", is_sample: false, parent_lot_id: null, notes: "High purity microcrystalline cellulose", received_by: "USR-005", qc_by: "USR-008", history: [], created_date: new Date("2026-02-25"), modified_date: new Date("2026-03-15") },
  { lot_id: "LOT-012", material_id: "MAT-011", manufacturer_name: "BioVitamin Corp", manufacturer_lot: "BVC-FA-2025-421", supplier_name: "Asia Pharma Distribution", received_date: new Date("2026-03-01"), expiration_date: new Date("2027-03-01"), in_use_expiration_date: new Date("2026-12-01"), status: "Accepted", quantity: 800, unit_of_measure: "capsule", storage_location: "COLD-STORE-A4", is_sample: false, parent_lot_id: null, notes: "Pharmaceutical grade folic acid", received_by: "USR-011", qc_by: "USR-014", history: [], created_date: new Date("2026-03-01"), modified_date: new Date("2026-03-15") },
  { lot_id: "LOT-013", material_id: "MAT-012", manufacturer_name: "Biotech Science Inc", manufacturer_lot: "BSI-BT-2025-633", supplier_name: "Premium Suppliers Inc", received_date: new Date("2026-03-05"), expiration_date: new Date("2027-03-05"), in_use_expiration_date: new Date("2026-11-05"), status: "Quarantine", quantity: 500, unit_of_measure: "capsule", storage_location: "QC-LAB-B3", is_sample: false, parent_lot_id: null, notes: "Under QC testing for potency verification", received_by: "USR-015", qc_by: null, history: [], created_date: new Date("2026-03-05"), modified_date: new Date("2026-03-15") },
  { lot_id: "LOT-014", material_id: "MAT-013", manufacturer_name: "Chemical Excipients Ltd", manufacturer_lot: "CEL-CCS-2025-744", supplier_name: "Chemical Excipients Ltd", received_date: new Date("2026-03-10"), expiration_date: new Date("2028-03-10"), status: "Accepted", quantity: 8000, unit_of_measure: "gram", storage_location: "DRY-STORE-C3", is_sample: false, parent_lot_id: null, notes: "Croscarmellose sodium for tablet binding", received_by: "USR-004", qc_by: "USR-007", history: [], created_date: new Date("2026-03-10"), modified_date: new Date("2026-03-15") },
  { lot_id: "LOT-015", material_id: "MAT-014", manufacturer_name: "PackCo Manufacturing", manufacturer_lot: "PCM-AL-2025-851", supplier_name: "Packaging Solutions Inc", received_date: new Date("2026-03-12"), expiration_date: new Date("2028-03-12"), status: "Accepted", quantity: 25000, unit_of_measure: "piece", storage_location: "PACKAGING-E1", is_sample: false, parent_lot_id: null, notes: "Aluminum blister packs for tablets", received_by: "USR-005", qc_by: "USR-008", history: [], created_date: new Date("2026-03-12"), modified_date: new Date("2026-03-15") },
  { lot_id: "LOT-016", material_id: "MAT-015", manufacturer_name: "Nutrient Plus Corp", manufacturer_lot: "NPC-SE-2025-962", supplier_name: "Premium Nutrient Supply", received_date: new Date("2026-03-13"), expiration_date: new Date("2027-03-13"), in_use_expiration_date: new Date("2027-01-13"), status: "Accepted", quantity: 600, unit_of_measure: "capsule", storage_location: "COLD-STORE-B3", is_sample: false, parent_lot_id: null, notes: "Selenium for antioxidant support", received_by: "USR-011", qc_by: "USR-014", history: [], created_date: new Date("2026-03-13"), modified_date: new Date("2026-03-15") },
  { lot_id: "LOT-017", material_id: "MAT-016", manufacturer_name: "Copper Supplements Ltd", manufacturer_lot: "CSL-CU-2025-157", supplier_name: "Asia Pharma Distribution", received_date: new Date("2026-03-14"), expiration_date: new Date("2027-03-14"), status: "Accepted", quantity: 900, unit_of_measure: "capsule", storage_location: "COLD-STORE-A5", is_sample: false, parent_lot_id: null, notes: "Copper gluconate for bone health", received_by: "USR-015", qc_by: "USR-018", history: [], created_date: new Date("2026-03-14"), modified_date: new Date("2026-03-15") },
  { lot_id: "LOT-018", material_id: "MAT-017", manufacturer_name: "Cellulose Corp", manufacturer_lot: "CC-MS-2025-268", supplier_name: "Chemical Excipients Ltd", received_date: new Date("2026-03-14"), expiration_date: new Date("2028-03-14"), status: "Accepted", quantity: 5000, unit_of_measure: "gram", storage_location: "DRY-STORE-C4", is_sample: false, parent_lot_id: null, notes: "Magnesium stearate for tablet lubrication", received_by: "USR-004", qc_by: "USR-007", history: [], created_date: new Date("2026-03-14"), modified_date: new Date("2026-03-15") },
  { lot_id: "LOT-019", material_id: "MAT-018", manufacturer_name: "CapTech Solutions", manufacturer_lot: "CTS-SG-2025-379", supplier_name: "Packaging Solutions Inc", received_date: new Date("2026-03-15"), expiration_date: new Date("2028-03-15"), status: "Accepted", quantity: 50000, unit_of_measure: "packet", storage_location: "PACKAGING-E2", is_sample: false, parent_lot_id: null, notes: "Silica gel desiccant packets for moisture control", received_by: "USR-005", qc_by: "USR-008", history: [], created_date: new Date("2026-03-15"), modified_date: new Date("2026-03-15") },
  { lot_id: "LOT-020", material_id: "MAT-019", manufacturer_name: "BioVitamin Corp", manufacturer_lot: "BVC-I-2025-485", supplier_name: "Asia Pharma Distribution", received_date: new Date("2026-03-15"), expiration_date: new Date("2027-03-15"), in_use_expiration_date: new Date("2026-11-15"), status: "Quarantine", quantity: 700, unit_of_measure: "capsule", storage_location: "QC-LAB-B4", is_sample: false, parent_lot_id: null, notes: "Iodine for thyroid support, pending QC", received_by: "USR-011", qc_by: null, history: [], created_date: new Date("2026-03-15"), modified_date: new Date("2026-03-15") },
  { lot_id: "LOT-021", material_id: "MAT-020", manufacturer_name: "Chemical Excipients Ltd", manufacturer_lot: "CEL-MAN-2025-591", supplier_name: "Chemical Excipients Ltd", received_date: new Date("2026-02-28"), expiration_date: new Date("2028-02-28"), status: "Accepted", quantity: 12000, unit_of_measure: "gram", storage_location: "DRY-STORE-C5", is_sample: false, parent_lot_id: null, notes: "Mannitol for tablet sweetening", received_by: "USR-015", qc_by: "USR-018", history: [], created_date: new Date("2026-02-28"), modified_date: new Date("2026-03-15") },
  { lot_id: "LOT-022", material_id: "MAT-021", manufacturer_name: "Nutrient Plus Corp", manufacturer_lot: "NPC-CR-2025-602", supplier_name: "Premium Nutrient Supply", received_date: new Date("2026-02-20"), expiration_date: new Date("2027-02-20"), status: "Accepted", quantity: 400, unit_of_measure: "capsule", storage_location: "COLD-STORE-B4", is_sample: false, parent_lot_id: null, notes: "Chromium picolinate for glucose metabolism", received_by: "USR-004", qc_by: "USR-007", history: [], created_date: new Date("2026-02-20"), modified_date: new Date("2026-03-15") },
  { lot_id: "LOT-023", material_id: "MAT-022", manufacturer_name: "PackCo Manufacturing", manufacturer_lot: "PCM-BOX-2025-713", supplier_name: "Packaging Solutions Inc", received_date: new Date("2026-03-01"), expiration_date: new Date("2027-03-01"), status: "Accepted", quantity: 30000, unit_of_measure: "piece", storage_location: "PACKAGING-F1", is_sample: false, parent_lot_id: null, notes: "Cardboard boxes for product packaging", received_by: "USR-005", qc_by: "USR-008", history: [], created_date: new Date("2026-03-01"), modified_date: new Date("2026-03-15") },
  { lot_id: "LOT-024", material_id: "MAT-023", manufacturer_name: "Quality Pharma Ltd", manufacturer_lot: "QPL-MULTI-2026-001", supplier_name: "Direct Manufacturing", received_date: new Date("2026-03-08"), expiration_date: new Date("2027-03-08"), in_use_expiration_date: new Date("2026-11-08"), status: "Accepted", quantity: 50000, unit_of_measure: "caplet", storage_location: "FINISHED-G1", is_sample: false, parent_lot_id: null, notes: "Finished multivitamin caplets, ready for distribution", received_by: "USR-011", qc_by: "USR-014", history: [], created_date: new Date("2026-03-08"), modified_date: new Date("2026-03-15") },
  { lot_id: "LOT-025", material_id: "MAT-024", manufacturer_name: "Quality Pharma Ltd", manufacturer_lot: "QPL-WH-2026-001", supplier_name: "Direct Manufacturing", received_date: new Date("2026-03-09"), expiration_date: new Date("2027-03-09"), in_use_expiration_date: new Date("2026-12-09"), status: "Accepted", quantity: 35000, unit_of_measure: "capsule", storage_location: "FINISHED-G2", is_sample: false, parent_lot_id: null, notes: "Women's health capsules, quality approved", received_by: "USR-015", qc_by: "USR-018", history: [], created_date: new Date("2026-03-09"), modified_date: new Date("2026-03-15") },
  { lot_id: "LOT-026", material_id: "MAT-025", manufacturer_name: "Quality Pharma Ltd", manufacturer_lot: "QPL-IMMUNE-2026-001", supplier_name: "Direct Manufacturing", received_date: new Date("2026-03-10"), expiration_date: new Date("2027-03-10"), in_use_expiration_date: new Date("2026-12-10"), status: "Accepted", quantity: 40000, unit_of_measure: "tablet", storage_location: "FINISHED-G3", is_sample: false, parent_lot_id: null, notes: "Immune boost tablets, certified batch", received_by: "USR-004", qc_by: "USR-007", history: [], created_date: new Date("2026-03-10"), modified_date: new Date("2026-03-15") },
  { lot_id: "LOT-027", material_id: "MAT-002", manufacturer_name: "BioVitamin Corp", manufacturer_lot: "BVC-VC-2025-157", supplier_name: "Asia Pharma Distribution", received_date: new Date("2026-02-10"), expiration_date: new Date("2027-02-10"), status: "Depleted", quantity: 0, unit_of_measure: "capsule", storage_location: "ARCHIVE", is_sample: false, parent_lot_id: null, notes: "Fully consumed in production, archived", received_by: "USR-005", qc_by: "USR-008", history: [], created_date: new Date("2026-02-10"), modified_date: new Date("2026-03-15") },
  { lot_id: "LOT-028", material_id: "MAT-003", manufacturer_name: "ChemTech Industries", manufacturer_lot: "CTI-CA-2025-090", supplier_name: "Industrial Minerals Supply", received_date: new Date("2026-03-07"), expiration_date: new Date("2029-03-07"), status: "Accepted", quantity: 8500, unit_of_measure: "capsule", storage_location: "DRY-STORE-D1", is_sample: false, parent_lot_id: null, notes: "Additional excipient batch received", received_by: "USR-011", qc_by: "USR-014", history: [], created_date: new Date("2026-03-07"), modified_date: new Date("2026-03-15") },
  { lot_id: "LOT-029", material_id: "MAT-008", manufacturer_name: "BioVitamin Corp", manufacturer_lot: "BVC-B12-2025-202", supplier_name: "Asia Pharma Distribution", received_date: new Date("2026-03-06"), expiration_date: new Date("2027-03-06"), in_use_expiration_date: new Date("2026-12-06"), status: "Accepted", quantity: 1200, unit_of_measure: "capsule", storage_location: "COLD-STORE-A6", is_sample: false, parent_lot_id: null, notes: "Second batch of high potency B12", received_by: "USR-015", qc_by: "USR-018", history: [], created_date: new Date("2026-03-06"), modified_date: new Date("2026-03-15") },
  { lot_id: "LOT-030", material_id: "MAT-009", manufacturer_name: "Iron Supplements Ltd", manufacturer_lot: "ISL-FE-2025-313", supplier_name: "Premium Suppliers Inc", received_date: new Date("2026-03-04"), expiration_date: new Date("2027-03-04"), in_use_expiration_date: new Date("2026-10-04"), status: "Accepted", quantity: 2000, unit_of_measure: "capsule", storage_location: "COLD-STORE-B5", is_sample: false, parent_lot_id: null, notes: "Replenishment batch for iron supplements", received_by: "USR-004", qc_by: "USR-007", history: [], created_date: new Date("2026-03-04"), modified_date: new Date("2026-03-15") }
]);


// ---- INVENTORY TRANSACTIONS (35 transactions) ----
db.inventory_transactions.insertMany([
  { transaction_id: "TXN-001", lot_id: "LOT-001", related_lot_id: null, transaction_type: "Receipt", quantity: "5000.00", unit_of_measure: "capsule", transaction_date: new Date("2026-01-10"), reference_number: "PO-2026-001", performed_by: "USR-004", notes: "Initial receipt of Vitamin D3", created_date: new Date("2026-01-10"), modified_date: new Date("2026-03-15") },
  { transaction_id: "TXN-002", lot_id: "LOT-001", related_lot_id: null, transaction_type: "Usage", quantity: "250.00", unit_of_measure: "capsule", transaction_date: new Date("2026-01-25"), reference_number: "PB-001", performed_by: "USR-005", notes: "Used in batch PB-001 production", created_date: new Date("2026-01-25"), modified_date: new Date("2026-03-15") },
  { transaction_id: "TXN-003", lot_id: "LOT-003", related_lot_id: null, transaction_type: "Receipt", quantity: "3000.00", unit_of_measure: "capsule", transaction_date: new Date("2026-01-15"), reference_number: "PO-2026-002", performed_by: "USR-005", notes: "Initial receipt of Vitamin C", created_date: new Date("2026-01-15"), modified_date: new Date("2026-03-15") },
  { transaction_id: "TXN-004", lot_id: "LOT-004", related_lot_id: null, transaction_type: "Receipt", quantity: "10000.00", unit_of_measure: "capsule", transaction_date: new Date("2026-01-20"), reference_number: "PO-2026-003", performed_by: "USR-011", notes: "Bulk excipient shipment received", created_date: new Date("2026-01-20"), modified_date: new Date("2026-03-15") },
  { transaction_id: "TXN-005", lot_id: "LOT-005", related_lot_id: null, transaction_type: "Receipt", quantity: "2000.00", unit_of_measure: "capsule", transaction_date: new Date("2026-01-25"), reference_number: "PO-2026-004", performed_by: "USR-015", notes: "Zinc supplement batch received", created_date: new Date("2026-01-25"), modified_date: new Date("2026-03-15") },
  { transaction_id: "TXN-006", lot_id: "LOT-006", related_lot_id: null, transaction_type: "Disposal", quantity: "5000.00", unit_of_measure: "capsule", transaction_date: new Date("2026-02-01"), reference_number: "REJECT-001", performed_by: "USR-007", notes: "Rejected batch disposed", created_date: new Date("2026-02-01"), modified_date: new Date("2026-03-15") },
  { transaction_id: "TXN-007", lot_id: "LOT-007", related_lot_id: null, transaction_type: "Receipt", quantity: "50000.00", unit_of_measure: "piece", transaction_date: new Date("2026-02-05"), reference_number: "PO-2026-005", performed_by: "USR-005", notes: "Packaging containers received", created_date: new Date("2026-02-05"), modified_date: new Date("2026-03-15") },
  { transaction_id: "TXN-008", lot_id: "LOT-007", related_lot_id: null, transaction_type: "Usage", quantity: "5000.00", unit_of_measure: "piece", transaction_date: new Date("2026-02-20"), reference_number: "PB-005", performed_by: "USR-011", notes: "Containers used in production", created_date: new Date("2026-02-20"), modified_date: new Date("2026-03-15") },
  { transaction_id: "TXN-009", lot_id: "LOT-008", related_lot_id: null, transaction_type: "Receipt", quantity: "100000.00", unit_of_measure: "piece", transaction_date: new Date("2026-02-10"), reference_number: "PO-2026-006", performed_by: "USR-011", notes: "Plastic caps batch received", created_date: new Date("2026-02-10"), modified_date: new Date("2026-03-15") },
  { transaction_id: "TXN-010", lot_id: "LOT-009", related_lot_id: null, transaction_type: "Receipt", quantity: "1500.00", unit_of_measure: "capsule", transaction_date: new Date("2026-02-15"), reference_number: "PO-2026-007", performed_by: "USR-015", notes: "Vitamin B12 received", created_date: new Date("2026-02-15"), modified_date: new Date("2026-03-15") },
  { transaction_id: "TXN-011", lot_id: "LOT-010", related_lot_id: null, transaction_type: "Receipt", quantity: "2500.00", unit_of_measure: "capsule", transaction_date: new Date("2026-02-20"), reference_number: "PO-2026-008", performed_by: "USR-004", notes: "Iron supplement received", created_date: new Date("2026-02-20"), modified_date: new Date("2026-03-15") },
  { transaction_id: "TXN-012", lot_id: "LOT-010", related_lot_id: null, transaction_type: "Usage", quantity: "150.00", unit_of_measure: "capsule", transaction_date: new Date("2026-02-28"), reference_number: "PB-008", performed_by: "USR-015", notes: "Iron used in batch formulation", created_date: new Date("2026-02-28"), modified_date: new Date("2026-03-15") },
  { transaction_id: "TXN-013", lot_id: "LOT-011", related_lot_id: null, transaction_type: "Receipt", quantity: "15000.00", unit_of_measure: "gram", transaction_date: new Date("2026-02-25"), reference_number: "PO-2026-009", performed_by: "USR-005", notes: "Microcrystalline cellulose received", created_date: new Date("2026-02-25"), modified_date: new Date("2026-03-15") },
  { transaction_id: "TXN-014", lot_id: "LOT-011", related_lot_id: null, transaction_type: "Usage", quantity: "500.00", unit_of_measure: "gram", transaction_date: new Date("2026-03-05"), reference_number: "PB-010", performed_by: "USR-004", notes: "Cellulose binder used in tablets", created_date: new Date("2026-03-05"), modified_date: new Date("2026-03-15") },
  { transaction_id: "TXN-015", lot_id: "LOT-012", related_lot_id: null, transaction_type: "Receipt", quantity: "800.00", unit_of_measure: "capsule", transaction_date: new Date("2026-03-01"), reference_number: "PO-2026-010", performed_by: "USR-011", notes: "Folic acid received", created_date: new Date("2026-03-01"), modified_date: new Date("2026-03-15") },
  { transaction_id: "TXN-016", lot_id: "LOT-014", related_lot_id: null, transaction_type: "Receipt", quantity: "8000.00", unit_of_measure: "gram", transaction_date: new Date("2026-03-10"), reference_number: "PO-2026-011", performed_by: "USR-004", notes: "Croscarmellose received", created_date: new Date("2026-03-10"), modified_date: new Date("2026-03-15") },
  { transaction_id: "TXN-017", lot_id: "LOT-014", related_lot_id: null, transaction_type: "Usage", quantity: "300.00", unit_of_measure: "gram", transaction_date: new Date("2026-03-12"), reference_number: "PB-012", performed_by: "USR-005", notes: "Binder agent used in tablet production", created_date: new Date("2026-03-12"), modified_date: new Date("2026-03-15") },
  { transaction_id: "TXN-018", lot_id: "LOT-015", related_lot_id: null, transaction_type: "Receipt", quantity: "25000.00", unit_of_measure: "piece", transaction_date: new Date("2026-03-12"), reference_number: "PO-2026-012", performed_by: "USR-005", notes: "Blister packs received", created_date: new Date("2026-03-12"), modified_date: new Date("2026-03-15") },
  { transaction_id: "TXN-019", lot_id: "LOT-016", related_lot_id: null, transaction_type: "Receipt", quantity: "600.00", unit_of_measure: "capsule", transaction_date: new Date("2026-03-13"), reference_number: "PO-2026-013", performed_by: "USR-011", notes: "Selenium received", created_date: new Date("2026-03-13"), modified_date: new Date("2026-03-15") },
  { transaction_id: "TXN-020", lot_id: "LOT-017", related_lot_id: null, transaction_type: "Receipt", quantity: "900.00", unit_of_measure: "capsule", transaction_date: new Date("2026-03-14"), reference_number: "PO-2026-014", performed_by: "USR-015", notes: "Copper supplement received", created_date: new Date("2026-03-14"), modified_date: new Date("2026-03-15") },
  { transaction_id: "TXN-021", lot_id: "LOT-018", related_lot_id: null, transaction_type: "Receipt", quantity: "5000.00", unit_of_measure: "gram", transaction_date: new Date("2026-03-14"), reference_number: "PO-2026-015", performed_by: "USR-004", notes: "Magnesium stearate received", created_date: new Date("2026-03-14"), modified_date: new Date("2026-03-15") },
  { transaction_id: "TXN-022", lot_id: "LOT-018", related_lot_id: null, transaction_type: "Usage", quantity: "200.00", unit_of_measure: "gram", transaction_date: new Date("2026-03-14"), reference_number: "PB-014", performed_by: "USR-005", notes: "Lubricant used in tablet pressing", created_date: new Date("2026-03-14"), modified_date: new Date("2026-03-15") },
  { transaction_id: "TXN-023", lot_id: "LOT-019", related_lot_id: null, transaction_type: "Receipt", quantity: "50000.00", unit_of_measure: "packet", transaction_date: new Date("2026-03-15"), reference_number: "PO-2026-016", performed_by: "USR-005", notes: "Desiccant packets received", created_date: new Date("2026-03-15"), modified_date: new Date("2026-03-15") },
  { transaction_id: "TXN-024", lot_id: "LOT-021", related_lot_id: null, transaction_type: "Receipt", quantity: "12000.00", unit_of_measure: "gram", transaction_date: new Date("2026-02-28"), reference_number: "PO-2026-017", performed_by: "USR-015", notes: "Mannitol powder received", created_date: new Date("2026-02-28"), modified_date: new Date("2026-03-15") },
  { transaction_id: "TXN-025", lot_id: "LOT-021", related_lot_id: null, transaction_type: "Usage", quantity: "400.00", unit_of_measure: "gram", transaction_date: new Date("2026-03-08"), reference_number: "PB-016", performed_by: "USR-004", notes: "Sweetener used in tablet formulation", created_date: new Date("2026-03-08"), modified_date: new Date("2026-03-15") },
  { transaction_id: "TXN-026", lot_id: "LOT-022", related_lot_id: null, transaction_type: "Receipt", quantity: "400.00", unit_of_measure: "capsule", transaction_date: new Date("2026-02-20"), reference_number: "PO-2026-018", performed_by: "USR-004", notes: "Chromium received", created_date: new Date("2026-02-20"), modified_date: new Date("2026-03-15") },
  { transaction_id: "TXN-027", lot_id: "LOT-023", related_lot_id: null, transaction_type: "Receipt", quantity: "30000.00", unit_of_measure: "piece", transaction_date: new Date("2026-03-01"), reference_number: "PO-2026-019", performed_by: "USR-005", notes: "Cardboard boxes received", created_date: new Date("2026-03-01"), modified_date: new Date("2026-03-15") },
  { transaction_id: "TXN-028", lot_id: "LOT-023", related_lot_id: null, transaction_type: "Usage", quantity: "2000.00", unit_of_measure: "piece", transaction_date: new Date("2026-03-12"), reference_number: "PKG-001", performed_by: "USR-011", notes: "Boxes used for packaging", created_date: new Date("2026-03-12"), modified_date: new Date("2026-03-15") },
  { transaction_id: "TXN-029", lot_id: "LOT-024", related_lot_id: null, transaction_type: "Receipt", quantity: "50000.00", unit_of_measure: "caplet", transaction_date: new Date("2026-03-08"), reference_number: "MFG-001", performed_by: "USR-011", notes: "Multivitamin finished product received", created_date: new Date("2026-03-08"), modified_date: new Date("2026-03-15") },
  { transaction_id: "TXN-030", lot_id: "LOT-025", related_lot_id: null, transaction_type: "Receipt", quantity: "35000.00", unit_of_measure: "capsule", transaction_date: new Date("2026-03-09"), reference_number: "MFG-002", performed_by: "USR-015", notes: "Women's health finished product received", created_date: new Date("2026-03-09"), modified_date: new Date("2026-03-15") },
  { transaction_id: "TXN-031", lot_id: "LOT-026", related_lot_id: null, transaction_type: "Receipt", quantity: "40000.00", unit_of_measure: "tablet", transaction_date: new Date("2026-03-10"), reference_number: "MFG-003", performed_by: "USR-004", notes: "Immune boost finished product received", created_date: new Date("2026-03-10"), modified_date: new Date("2026-03-15") },
  { transaction_id: "TXN-032", lot_id: "LOT-001", related_lot_id: null, transaction_type: "Usage", quantity: "200.00", unit_of_measure: "capsule", transaction_date: new Date("2026-03-10"), reference_number: "PB-018", performed_by: "USR-005", notes: "Additional vitamin D3 for production", created_date: new Date("2026-03-10"), modified_date: new Date("2026-03-15") },
  { transaction_id: "TXN-033", lot_id: "LOT-028", related_lot_id: null, transaction_type: "Receipt", quantity: "8500.00", unit_of_measure: "capsule", transaction_date: new Date("2026-03-07"), reference_number: "PO-2026-020", performed_by: "USR-011", notes: "Additional excipient batch", created_date: new Date("2026-03-07"), modified_date: new Date("2026-03-15") },
  { transaction_id: "TXN-034", lot_id: "LOT-029", related_lot_id: null, transaction_type: "Receipt", quantity: "1200.00", unit_of_measure: "capsule", transaction_date: new Date("2026-03-06"), reference_number: "PO-2026-021", performed_by: "USR-015", notes: "B12 supplement replenishment", created_date: new Date("2026-03-06"), modified_date: new Date("2026-03-15") },
  { transaction_id: "TXN-035", lot_id: "LOT-030", related_lot_id: null, transaction_type: "Receipt", quantity: "2000.00", unit_of_measure: "capsule", transaction_date: new Date("2026-03-04"), reference_number: "PO-2026-022", performed_by: "USR-004", notes: "Iron supplement replenishment batch", created_date: new Date("2026-03-04"), modified_date: new Date("2026-03-15") }
]);

// ---- PRODUCTION BATCHES (25 batches) ----
db.production_batches.insertMany([
  { batch_id: "PB-001", product_id: "MAT-023", batch_number: "BATCH-2026-001", unit_of_measure: "caplet", shelf_life_value: 24, shelf_life_unit: "month", status: "Complete", batch_size: "50000", created_by: "USR-005", approved_by: "USR-002", completed_by: "USR-003", created_date: new Date("2026-02-01"), modified_date: new Date("2026-03-15") },
  { batch_id: "PB-002", product_id: "MAT-023", batch_number: "BATCH-2026-002", unit_of_measure: "caplet", shelf_life_value: 24, shelf_life_unit: "month", status: "Complete", batch_size: "45000", created_by: "USR-004", approved_by: "USR-002", completed_by: "USR-003", created_date: new Date("2026-02-05"), modified_date: new Date("2026-03-15") },
  { batch_id: "PB-003", product_id: "MAT-024", batch_number: "BATCH-2026-003", unit_of_measure: "capsule", shelf_life_value: 24, shelf_life_unit: "month", status: "Complete", batch_size: "35000", created_by: "USR-015", approved_by: "USR-013", completed_by: "USR-003", created_date: new Date("2026-02-08"), modified_date: new Date("2026-03-15") },
  { batch_id: "PB-004", product_id: "MAT-025", batch_number: "BATCH-2026-004", unit_of_measure: "tablet", shelf_life_value: 24, shelf_life_unit: "month", status: "Complete", batch_size: "40000", created_by: "USR-011", approved_by: "USR-002", completed_by: "USR-003", created_date: new Date("2026-02-10"), modified_date: new Date("2026-03-15") },
  { batch_id: "PB-005", product_id: "MAT-023", batch_number: "BATCH-2026-005", unit_of_measure: "caplet", shelf_life_value: 24, shelf_life_unit: "month", status: "In Progress", batch_size: "30000", created_by: "USR-004", approved_by: "USR-002", completed_by: null, created_date: new Date("2026-02-15"), modified_date: new Date("2026-03-15") },
  { batch_id: "PB-006", product_id: "MAT-024", batch_number: "BATCH-2026-006", unit_of_measure: "capsule", shelf_life_value: 24, shelf_life_unit: "month", status: "In Progress", batch_size: "25000", created_by: "USR-005", approved_by: "USR-013", completed_by: null, created_date: new Date("2026-02-18"), modified_date: new Date("2026-03-15") },
  { batch_id: "PB-007", product_id: "MAT-025", batch_number: "BATCH-2026-007", unit_of_measure: "tablet", shelf_life_value: 24, shelf_life_unit: "month", status: "On Hold", batch_size: "20000", created_by: "USR-011", approved_by: "USR-002", completed_by: null, created_date: new Date("2026-02-20"), modified_date: new Date("2026-03-15") },
  { batch_id: "PB-008", product_id: "MAT-023", batch_number: "BATCH-2026-008", unit_of_measure: "caplet", shelf_life_value: 24, shelf_life_unit: "month", status: "Complete", batch_size: "55000", created_by: "USR-015", approved_by: "USR-002", completed_by: "USR-003", created_date: new Date("2026-02-22"), modified_date: new Date("2026-03-15") },
  { batch_id: "PB-009", product_id: "MAT-024", batch_number: "BATCH-2026-009", unit_of_measure: "capsule", shelf_life_value: 24, shelf_life_unit: "month", status: "Cancelled", batch_size: "15000", created_by: "USR-004", approved_by: "USR-013", completed_by: null, created_date: new Date("2026-02-25"), modified_date: new Date("2026-03-15") },
  { batch_id: "PB-010", product_id: "MAT-025", batch_number: "BATCH-2026-010", unit_of_measure: "tablet", shelf_life_value: 24, shelf_life_unit: "month", status: "Complete", batch_size: "38000", created_by: "USR-011", approved_by: "USR-002", completed_by: "USR-003", created_date: new Date("2026-02-28"), modified_date: new Date("2026-03-15") },
  { batch_id: "PB-011", product_id: "MAT-023", batch_number: "BATCH-2026-011", unit_of_measure: "caplet", shelf_life_value: 24, shelf_life_unit: "month", status: "In Progress", batch_size: "42000", created_by: "USR-005", approved_by: "USR-002", completed_by: null, created_date: new Date("2026-03-01"), modified_date: new Date("2026-03-15") },
  { batch_id: "PB-012", product_id: "MAT-024", batch_number: "BATCH-2026-012", unit_of_measure: "capsule", shelf_life_value: 24, shelf_life_unit: "month", status: "In Progress", batch_size: "28000", created_by: "USR-015", approved_by: "USR-013", completed_by: null, created_date: new Date("2026-03-03"), modified_date: new Date("2026-03-15") },
  { batch_id: "PB-013", product_id: "MAT-025", batch_number: "BATCH-2026-013", unit_of_measure: "tablet", shelf_life_value: 24, shelf_life_unit: "month", status: "Complete", batch_size: "33000", created_by: "USR-011", approved_by: "USR-002", completed_by: "USR-003", created_date: new Date("2026-03-05"), modified_date: new Date("2026-03-15") },
  { batch_id: "PB-014", product_id: "MAT-023", batch_number: "BATCH-2026-014", unit_of_measure: "caplet", shelf_life_value: 24, shelf_life_unit: "month", status: "On Hold", batch_size: "48000", created_by: "USR-004", approved_by: "USR-002", completed_by: null, created_date: new Date("2026-03-07"), modified_date: new Date("2026-03-15") },
  { batch_id: "PB-015", product_id: "MAT-024", batch_number: "BATCH-2026-015", unit_of_measure: "capsule", shelf_life_value: 24, shelf_life_unit: "month", status: "In Progress", batch_size: "31000", created_by: "USR-005", approved_by: "USR-013", completed_by: null, created_date: new Date("2026-03-08"), modified_date: new Date("2026-03-15") },
  { batch_id: "PB-016", product_id: "MAT-025", batch_number: "BATCH-2026-016", unit_of_measure: "tablet", shelf_life_value: 24, shelf_life_unit: "month", status: "Complete", batch_size: "36000", created_by: "USR-015", approved_by: "USR-002", completed_by: "USR-003", created_date: new Date("2026-03-09"), modified_date: new Date("2026-03-15") },
  { batch_id: "PB-017", product_id: "MAT-023", batch_number: "BATCH-2026-017", unit_of_measure: "caplet", shelf_life_value: 24, shelf_life_unit: "month", status: "In Progress", batch_size: "39000", created_by: "USR-011", approved_by: "USR-002", completed_by: null, created_date: new Date("2026-03-10"), modified_date: new Date("2026-03-15") },
  { batch_id: "PB-018", product_id: "MAT-024", batch_number: "BATCH-2026-018", unit_of_measure: "capsule", shelf_life_value: 24, shelf_life_unit: "month", status: "Complete", batch_size: "29000", created_by: "USR-004", approved_by: "USR-013", completed_by: "USR-003", created_date: new Date("2026-03-11"), modified_date: new Date("2026-03-15") },
  { batch_id: "PB-019", product_id: "MAT-025", batch_number: "BATCH-2026-019", unit_of_measure: "tablet", shelf_life_value: 24, shelf_life_unit: "month", status: "On Hold", batch_size: "22000", created_by: "USR-005", approved_by: "USR-002", completed_by: null, created_date: new Date("2026-03-12"), modified_date: new Date("2026-03-15") },
  { batch_id: "PB-020", product_id: "MAT-023", batch_number: "BATCH-2026-020", unit_of_measure: "caplet", shelf_life_value: 24, shelf_life_unit: "month", status: "In Progress", batch_size: "44000", created_by: "USR-015", approved_by: "USR-002", completed_by: null, created_date: new Date("2026-03-13"), modified_date: new Date("2026-03-15") },
  { batch_id: "PB-021", product_id: "MAT-024", batch_number: "BATCH-2026-021", unit_of_measure: "capsule", shelf_life_value: 24, shelf_life_unit: "month", status: "Complete", batch_size: "32000", created_by: "USR-011", approved_by: "USR-013", completed_by: "USR-003", created_date: new Date("2026-03-14"), modified_date: new Date("2026-03-15") },
  { batch_id: "PB-022", product_id: "MAT-025", batch_number: "BATCH-2026-022", unit_of_measure: "tablet", shelf_life_value: 24, shelf_life_unit: "month", status: "In Progress", batch_size: "27000", created_by: "USR-004", approved_by: "USR-002", completed_by: null, created_date: new Date("2026-03-14"), modified_date: new Date("2026-03-15") },
  { batch_id: "PB-023", product_id: "MAT-023", batch_number: "BATCH-2026-023", unit_of_measure: "caplet", shelf_life_value: 24, shelf_life_unit: "month", status: "Complete", batch_size: "51000", created_by: "USR-005", approved_by: "USR-002", completed_by: "USR-003", created_date: new Date("2026-03-15"), modified_date: new Date("2026-03-15") },
  { batch_id: "PB-024", product_id: "MAT-024", batch_number: "BATCH-2026-024", unit_of_measure: "capsule", shelf_life_value: 24, shelf_life_unit: "month", status: "In Progress", batch_size: "26000", created_by: "USR-015", approved_by: "USR-013", completed_by: null, created_date: new Date("2026-03-15"), modified_date: new Date("2026-03-15") },
  { batch_id: "PB-025", product_id: "MAT-025", batch_number: "BATCH-2026-025", unit_of_measure: "tablet", shelf_life_value: 24, shelf_life_unit: "month", status: "In Progress", batch_size: "37000", created_by: "USR-011", approved_by: "USR-002", completed_by: null, created_date: new Date("2026-03-15"), modified_date: new Date("2026-03-15") }
]);

// ---- BATCH COMPONENTS (30 components) ----
db.batch_components.insertMany([
  { component_id: "BC-001", batch_id: "PB-001", lot_id: "LOT-001", planned_quantity: "250.00", actual_quantity: "250.00", unit_of_measure: "capsule", addition_date: new Date("2026-02-02"), added_by: "USR-005", created_date: new Date("2026-02-02"), modified_date: new Date("2026-03-15") },
  { component_id: "BC-002", batch_id: "PB-001", lot_id: "LOT-003", planned_quantity: "300.00", actual_quantity: "300.00", unit_of_measure: "capsule", addition_date: new Date("2026-02-02"), added_by: "USR-005", created_date: new Date("2026-02-02"), modified_date: new Date("2026-03-15") },
  { component_id: "BC-003", batch_id: "PB-001", lot_id: "LOT-004", planned_quantity: "1200.00", actual_quantity: "1200.00", unit_of_measure: "capsule", addition_date: new Date("2026-02-02"), added_by: "USR-005", created_date: new Date("2026-02-02"), modified_date: new Date("2026-03-15") },
  { component_id: "BC-004", batch_id: "PB-002", lot_id: "LOT-001", planned_quantity: "200.00", actual_quantity: "200.00", unit_of_measure: "capsule", addition_date: new Date("2026-02-06"), added_by: "USR-004", created_date: new Date("2026-02-06"), modified_date: new Date("2026-03-15") },
  { component_id: "BC-005", batch_id: "PB-002", lot_id: "LOT-003", planned_quantity: "275.00", actual_quantity: "275.00", unit_of_measure: "capsule", addition_date: new Date("2026-02-06"), added_by: "USR-004", created_date: new Date("2026-02-06"), modified_date: new Date("2026-03-15") },
  { component_id: "BC-006", batch_id: "PB-003", lot_id: "LOT-005", planned_quantity: "150.00", actual_quantity: "150.00", unit_of_measure: "capsule", addition_date: new Date("2026-02-09"), added_by: "USR-015", created_date: new Date("2026-02-09"), modified_date: new Date("2026-03-15") },
  { component_id: "BC-007", batch_id: "PB-003", lot_id: "LOT-009", planned_quantity: "180.00", actual_quantity: "180.00", unit_of_measure: "capsule", addition_date: new Date("2026-02-09"), added_by: "USR-015", created_date: new Date("2026-02-09"), modified_date: new Date("2026-03-15") },
  { component_id: "BC-008", batch_id: "PB-004", lot_id: "LOT-004", planned_quantity: "2000.00", actual_quantity: "2000.00", unit_of_measure: "capsule", addition_date: new Date("2026-02-11"), added_by: "USR-011", created_date: new Date("2026-02-11"), modified_date: new Date("2026-03-15") },
  { component_id: "BC-009", batch_id: "PB-004", lot_id: "LOT-010", planned_quantity: "200.00", actual_quantity: "200.00", unit_of_measure: "capsule", addition_date: new Date("2026-02-11"), added_by: "USR-011", created_date: new Date("2026-02-11"), modified_date: new Date("2026-03-15") },
  { component_id: "BC-010", batch_id: "PB-005", lot_id: "LOT-001", planned_quantity: "180.00", actual_quantity: "180.00", unit_of_measure: "capsule", addition_date: new Date("2026-02-16"), added_by: "USR-004", created_date: new Date("2026-02-16"), modified_date: new Date("2026-03-15") },
  { component_id: "BC-011", batch_id: "PB-005", lot_id: "LOT-003", planned_quantity: "220.00", actual_quantity: "220.00", unit_of_measure: "capsule", addition_date: new Date("2026-02-16"), added_by: "USR-004", created_date: new Date("2026-02-16"), modified_date: new Date("2026-03-15") },
  { component_id: "BC-012", batch_id: "PB-006", lot_id: "LOT-005", planned_quantity: "140.00", actual_quantity: null, unit_of_measure: "capsule", addition_date: new Date("2026-02-19"), added_by: "USR-005", created_date: new Date("2026-02-19"), modified_date: new Date("2026-03-15") },
  { component_id: "BC-013", batch_id: "PB-006", lot_id: "LOT-012", planned_quantity: "160.00", actual_quantity: null, unit_of_measure: "capsule", addition_date: new Date("2026-02-19"), added_by: "USR-005", created_date: new Date("2026-02-19"), modified_date: new Date("2026-03-15") },
  { component_id: "BC-014", batch_id: "PB-007", lot_id: "LOT-004", planned_quantity: "1500.00", actual_quantity: null, unit_of_measure: "capsule", addition_date: new Date("2026-02-21"), added_by: "USR-011", created_date: new Date("2026-02-21"), modified_date: new Date("2026-03-15") },
  { component_id: "BC-015", batch_id: "PB-008", lot_id: "LOT-001", planned_quantity: "280.00", actual_quantity: "280.00", unit_of_measure: "capsule", addition_date: new Date("2026-02-23"), added_by: "USR-015", created_date: new Date("2026-02-23"), modified_date: new Date("2026-03-15") },
  { component_id: "BC-016", batch_id: "PB-008", lot_id: "LOT-003", planned_quantity: "320.00", actual_quantity: "320.00", unit_of_measure: "capsule", addition_date: new Date("2026-02-23"), added_by: "USR-015", created_date: new Date("2026-02-23"), modified_date: new Date("2026-03-15") },
  { component_id: "BC-017", batch_id: "PB-010", lot_id: "LOT-004", planned_quantity: "1800.00", actual_quantity: "1800.00", unit_of_measure: "capsule", addition_date: new Date("2026-03-01"), added_by: "USR-011", created_date: new Date("2026-03-01"), modified_date: new Date("2026-03-15") },
  { component_id: "BC-018", batch_id: "PB-010", lot_id: "LOT-016", planned_quantity: "120.00", actual_quantity: "120.00", unit_of_measure: "capsule", addition_date: new Date("2026-03-01"), added_by: "USR-011", created_date: new Date("2026-03-01"), modified_date: new Date("2026-03-15") },
  { component_id: "BC-019", batch_id: "PB-011", lot_id: "LOT-001", planned_quantity: "220.00", actual_quantity: null, unit_of_measure: "capsule", addition_date: new Date("2026-03-02"), added_by: "USR-005", created_date: new Date("2026-03-02"), modified_date: new Date("2026-03-15") },
  { component_id: "BC-020", batch_id: "PB-011", lot_id: "LOT-010", planned_quantity: "140.00", actual_quantity: null, unit_of_measure: "capsule", addition_date: new Date("2026-03-02"), added_by: "USR-005", created_date: new Date("2026-03-02"), modified_date: new Date("2026-03-15") },
  { component_id: "BC-021", batch_id: "PB-013", lot_id: "LOT-004", planned_quantity: "1650.00", actual_quantity: "1650.00", unit_of_measure: "capsule", addition_date: new Date("2026-03-06"), added_by: "USR-011", created_date: new Date("2026-03-06"), modified_date: new Date("2026-03-15") },
  { component_id: "BC-022", batch_id: "PB-013", lot_id: "LOT-022", planned_quantity: "110.00", actual_quantity: "110.00", unit_of_measure: "capsule", addition_date: new Date("2026-03-06"), added_by: "USR-011", created_date: new Date("2026-03-06"), modified_date: new Date("2026-03-15") },
  { component_id: "BC-023", batch_id: "PB-014", lot_id: "LOT-001", planned_quantity: "260.00", actual_quantity: null, unit_of_measure: "capsule", addition_date: new Date("2026-03-08"), added_by: "USR-004", created_date: new Date("2026-03-08"), modified_date: new Date("2026-03-15") },
  { component_id: "BC-024", batch_id: "PB-014", lot_id: "LOT-029", planned_quantity: "190.00", actual_quantity: null, unit_of_measure: "capsule", addition_date: new Date("2026-03-08"), added_by: "USR-004", created_date: new Date("2026-03-08"), modified_date: new Date("2026-03-15") },
  { component_id: "BC-025", batch_id: "PB-016", lot_id: "LOT-004", planned_quantity: "1800.00", actual_quantity: "1800.00", unit_of_measure: "capsule", addition_date: new Date("2026-03-09"), added_by: "USR-015", created_date: new Date("2026-03-09"), modified_date: new Date("2026-03-15") },
  { component_id: "BC-026", batch_id: "PB-016", lot_id: "LOT-015", planned_quantity: "100.00", actual_quantity: "100.00", unit_of_measure: "capsule", addition_date: new Date("2026-03-09"), added_by: "USR-015", created_date: new Date("2026-03-09"), modified_date: new Date("2026-03-15") },
  { component_id: "BC-027", batch_id: "PB-018", lot_id: "LOT-005", planned_quantity: "130.00", actual_quantity: "130.00", unit_of_measure: "capsule", addition_date: new Date("2026-03-12"), added_by: "USR-004", created_date: new Date("2026-03-12"), modified_date: new Date("2026-03-15") },
  { component_id: "BC-028", batch_id: "PB-018", lot_id: "LOT-017", planned_quantity: "145.00", actual_quantity: "145.00", unit_of_measure: "capsule", addition_date: new Date("2026-03-12"), added_by: "USR-004", created_date: new Date("2026-03-12"), modified_date: new Date("2026-03-15") },
  { component_id: "BC-029", batch_id: "PB-021", lot_id: "LOT-009", planned_quantity: "170.00", actual_quantity: "170.00", unit_of_measure: "capsule", addition_date: new Date("2026-03-15"), added_by: "USR-011", created_date: new Date("2026-03-15"), modified_date: new Date("2026-03-15") },
  { component_id: "BC-030", batch_id: "PB-021", lot_id: "LOT-030", planned_quantity: "165.00", actual_quantity: "165.00", unit_of_measure: "capsule", addition_date: new Date("2026-03-15"), added_by: "USR-011", created_date: new Date("2026-03-15"), modified_date: new Date("2026-03-15") }
]);
// thêm nhiều giao dịch mẫu
const extraTxns = [];
for (let i = 2; i <= 30; i++) {
  extraTxns.push({
    transaction_id: `txn-uuid-${String(i).padStart(3,'0')}`,
    lot_id: i % 2 === 0 ? "lot-uuid-001" : "lot-uuid-002",
    transaction_type: ["Receipt","Usage","Adjustment"][i % 3],
    quantity: NumberDecimal((Math.random() * 50 + 1).toFixed(3)),
    unit_of_measure: "kg",
    performed_by: i % 2 === 0 ? "jdoe" : "asmith",
    transaction_date: new Date(2025, 0, i),
    created_date: new Date(2025, 0, i),
    notes: i % 5 === 0 ? "automated seed" : undefined,
  });
}
db.inventorytransactions.insertMany(extraTxns);

// ---- QC TESTS (30 tests) ----
db.qc_tests.insertMany([
  { test_id: "TEST-001", lot_id: "LOT-001", test_type: "Identity", test_method: "HPLC", test_date: new Date("2026-01-11"), test_result: "Vitamin D3 identity confirmed by HPLC", acceptance_criteria: "Retention time 8.5 ± 0.3 min", result_status: "Pass", performed_by: "USR-007", verified_by: "USR-013", reject_reason: null, retry_count: 0, created_date: new Date("2026-01-11"), modified_date: new Date("2026-03-15") },
  { test_id: "TEST-002", lot_id: "LOT-001", test_type: "Potency", test_method: "UV Spectrophotometry", test_date: new Date("2026-01-11"), test_result: "Assay 99.8%, Content uniformity within limits", acceptance_criteria: "90.0-110.0%", result_status: "Pass", performed_by: "USR-008", verified_by: "USR-013", reject_reason: null, retry_count: 0, created_date: new Date("2026-01-11"), modified_date: new Date("2026-03-15") },
  { test_id: "TEST-003", lot_id: "LOT-002", test_type: "Microbial", test_method: "USP <2023> - Plate Count", test_date: new Date("2026-01-12"), test_result: "TAMC < 100 CFU/g, TYMC < 10 CFU/g, Pathogens absent", acceptance_criteria: "TAMC ≤ 1000 CFU/g", result_status: "Pass", performed_by: "USR-014", verified_by: "USR-013", reject_reason: null, retry_count: 0, created_date: new Date("2026-01-12"), modified_date: new Date("2026-03-15") },
  { test_id: "TEST-004", lot_id: "LOT-003", test_type: "Physical", test_method: "Visual Inspection", test_date: new Date("2026-01-16"), test_result: "Appearance white/off-white powder, no lumps detected", acceptance_criteria: "No visible impurities", result_status: "Pass", performed_by: "USR-007", verified_by: "USR-013", reject_reason: null, retry_count: 0, created_date: new Date("2026-01-16"), modified_date: new Date("2026-03-15") },
  { test_id: "TEST-005", lot_id: "LOT-003", test_type: "Chemical", test_method: "HPLC", test_date: new Date("2026-01-16"), test_result: "Ascorbic acid 99.5%, Impurities < 0.5%", acceptance_criteria: "98.0-102.0%", result_status: "Pass", performed_by: "USR-008", verified_by: "USR-013", reject_reason: null, retry_count: 0, created_date: new Date("2026-01-16"), modified_date: new Date("2026-03-15") },
  { test_id: "TEST-006", lot_id: "LOT-004", test_type: "Physical", test_method: "Visual Inspection", test_date: new Date("2026-01-21"), test_result: "White crystalline powder, uniform appearance", acceptance_criteria: "No foreign matter", result_status: "Pass", performed_by: "USR-014", verified_by: "USR-013", reject_reason: null, retry_count: 0, created_date: new Date("2026-01-21"), modified_date: new Date("2026-03-15") },
  { test_id: "TEST-007", lot_id: "LOT-005", test_type: "Potency", test_method: "Atomic Absorption Spectrophotometry", test_date: new Date("2026-01-26"), test_result: "Zinc content 99.2% of labeled amount", acceptance_criteria: "90.0-110.0%", result_status: "Pass", performed_by: "USR-018", verified_by: "USR-013", reject_reason: null, retry_count: 0, created_date: new Date("2026-01-26"), modified_date: new Date("2026-03-15") },
  { test_id: "TEST-008", lot_id: "LOT-006", test_type: "Physical", test_method: "Visual Inspection", test_date: new Date("2026-02-02"), test_result: "Moisture content 8.5%, exceeds specification limit 3%", acceptance_criteria: "≤ 3.0%", result_status: "Fail", performed_by: "USR-007", verified_by: "USR-013", reject_reason: "Failed moisture test, moisture content too high", retry_count: 1, created_date: new Date("2026-02-02"), modified_date: new Date("2026-03-15") },
  { test_id: "TEST-009", lot_id: "LOT-007", test_type: "Physical", test_method: "Visual Inspection", test_date: new Date("2026-02-06"), test_result: "No cracks or deformations observed, color uniform", acceptance_criteria: "No defects", result_status: "Pass", performed_by: "USR-008", verified_by: "USR-013", reject_reason: null, retry_count: 0, created_date: new Date("2026-02-06"), modified_date: new Date("2026-03-15") },
  { test_id: "TEST-010", lot_id: "LOT-008", test_type: "Physical", test_method: "Dimension Check", test_date: new Date("2026-02-11"), test_result: "Cap dimensions within specification: 18±0.5mm diameter", acceptance_criteria: "18±1.0mm", result_status: "Pass", performed_by: "USR-014", verified_by: "USR-013", reject_reason: null, retry_count: 0, created_date: new Date("2026-02-11"), modified_date: new Date("2026-03-15") },
  { test_id: "TEST-011", lot_id: "LOT-009", test_type: "Identity", test_method: "HPLC", test_date: new Date("2026-02-16"), test_result: "Cyanocobalamin identity confirmed", acceptance_criteria: "Retention time 5.2 ± 0.2 min", result_status: "Pass", performed_by: "USR-018", verified_by: "USR-013", reject_reason: null, retry_count: 0, created_date: new Date("2026-02-16"), modified_date: new Date("2026-03-15") },
  { test_id: "TEST-012", lot_id: "LOT-010", test_type: "Potency", test_method: "Atomic Absorption Spectrophotometry", test_date: new Date("2026-02-21"), test_result: "Iron content 99.0% of labeled amount", acceptance_criteria: "90.0-110.0%", result_status: "Pass", performed_by: "USR-007", verified_by: "USR-013", reject_reason: null, retry_count: 0, created_date: new Date("2026-02-21"), modified_date: new Date("2026-03-15") },
  { test_id: "TEST-013", lot_id: "LOT-011", test_type: "Physical", test_method: "Visual Inspection", test_date: new Date("2026-02-26"), test_result: "Fine white powder, no agglomeration", acceptance_criteria: "Particle size < 100 microns", result_status: "Pass", performed_by: "USR-008", verified_by: "USR-013", reject_reason: null, retry_count: 0, created_date: new Date("2026-02-26"), modified_date: new Date("2026-03-15") },
  { test_id: "TEST-014", lot_id: "LOT-012", test_type: "Potency", test_method: "HPLC", test_date: new Date("2026-03-02"), test_result: "Folic acid content pending verification", acceptance_criteria: "95.0-105.0%", result_status: "Pending", performed_by: "USR-014", verified_by: null, reject_reason: null, retry_count: 0, created_date: new Date("2026-03-02"), modified_date: new Date("2026-03-15") },
  { test_id: "TEST-015", lot_id: "LOT-013", test_type: "Microbial", test_method: "USP <2023>", test_date: new Date("2026-03-06"), test_result: "TAMC < 50 CFU/g, no pathogens detected", acceptance_criteria: "TAMC ≤ 1000 CFU/g", result_status: "Pass", performed_by: "USR-018", verified_by: "USR-013", reject_reason: null, retry_count: 0, created_date: new Date("2026-03-06"), modified_date: new Date("2026-03-15") },
  { test_id: "TEST-016", lot_id: "LOT-014", test_type: "Physical", test_method: "Moisture Analysis", test_date: new Date("2026-03-11"), test_result: "Moisture content 1.2%, within specification", acceptance_criteria: "≤ 5.0%", result_status: "Pass", performed_by: "USR-007", verified_by: "USR-013", reject_reason: null, retry_count: 0, created_date: new Date("2026-03-11"), modified_date: new Date("2026-03-15") },
  { test_id: "TEST-017", lot_id: "LOT-015", test_type: "Physical", test_method: "Dimension Check", test_date: new Date("2026-03-13"), test_result: "Blister dimensions verified: 10.5x8.2x1.2cm", acceptance_criteria: "10.5±0.2 x 8.2±0.2 x 1.2±0.1cm", result_status: "Pass", performed_by: "USR-008", verified_by: "USR-013", reject_reason: null, retry_count: 0, created_date: new Date("2026-03-13"), modified_date: new Date("2026-03-15") },
  { test_id: "TEST-018", lot_id: "LOT-016", test_type: "Potency", test_method: "ICP-MS", test_date: new Date("2026-03-14"), test_result: "Selenium content 99.5% of labeled amount", acceptance_criteria: "90.0-110.0%", result_status: "Pass", performed_by: "USR-014", verified_by: "USR-013", reject_reason: null, retry_count: 0, created_date: new Date("2026-03-14"), modified_date: new Date("2026-03-15") },
  { test_id: "TEST-019", lot_id: "LOT-017", test_type: "Identity", test_method: "HPLC", test_date: new Date("2026-03-15"), test_result: "Copper gluconate identity confirmed", acceptance_criteria: "Retention time 6.8 ± 0.3 min", result_status: "Pass", performed_by: "USR-018", verified_by: "USR-013", reject_reason: null, retry_count: 0, created_date: new Date("2026-03-15"), modified_date: new Date("2026-03-15") },
  { test_id: "TEST-020", lot_id: "LOT-018", test_type: "Physical", test_method: "Moisture Analysis", test_date: new Date("2026-03-15"), test_result: "Moisture 0.8%, well below limit", acceptance_criteria: "≤ 2.0%", result_status: "Pass", performed_by: "USR-007", verified_by: "USR-013", reject_reason: null, retry_count: 0, created_date: new Date("2026-03-15"), modified_date: new Date("2026-03-15") },
  { test_id: "TEST-021", lot_id: "LOT-019", test_type: "Physical", test_method: "Visual Inspection", test_date: new Date("2026-03-15"), test_result: "Packets intact, silica color indicating proper absorption", acceptance_criteria: "No damage, color < 50% blue", result_status: "Pass", performed_by: "USR-008", verified_by: "USR-013", reject_reason: null, retry_count: 0, created_date: new Date("2026-03-15"), modified_date: new Date("2026-03-15") },
  { test_id: "TEST-022", lot_id: "LOT-020", test_type: "Potency", test_method: "HPLC", test_date: new Date("2026-03-15"), test_result: "Iodine content awaiting verification", acceptance_criteria: "95.0-105.0%", result_status: "Pending", performed_by: "USR-014", verified_by: null, reject_reason: null, retry_count: 0, created_date: new Date("2026-03-15"), modified_date: new Date("2026-03-15") },
  { test_id: "TEST-023", lot_id: "LOT-021", test_type: "Physical", test_method: "Moisture Analysis", test_date: new Date("2026-03-02"), test_result: "Moisture 0.5%, excellent quality", acceptance_criteria: "≤ 1.0%", result_status: "Pass", performed_by: "USR-018", verified_by: "USR-013", reject_reason: null, retry_count: 0, created_date: new Date("2026-03-02"), modified_date: new Date("2026-03-15") },
  { test_id: "TEST-024", lot_id: "LOT-022", test_type: "Identity", test_method: "HPLC", test_date: new Date("2026-02-21"), test_result: "Chromium picolinate identity confirmed", acceptance_criteria: "Retention time 4.5 ± 0.2 min", result_status: "Pass", performed_by: "USR-007", verified_by: "USR-013", reject_reason: null, retry_count: 0, created_date: new Date("2026-02-21"), modified_date: new Date("2026-03-15") },
  { test_id: "TEST-025", lot_id: "LOT-023", test_type: "Physical", test_method: "Visual Inspection", test_date: new Date("2026-03-02"), test_result: "Box printing quality excellent, no ink smudging", acceptance_criteria: "Print quality grade A", result_status: "Pass", performed_by: "USR-008", verified_by: "USR-013", reject_reason: null, retry_count: 0, created_date: new Date("2026-03-02"), modified_date: new Date("2026-03-15") },
  { test_id: "TEST-026", lot_id: "LOT-024", test_type: "Chemical", test_method: "HPLC", test_date: new Date("2026-03-09"), test_result: "All active ingredients within specification", acceptance_criteria: "Each 90-110% of label", result_status: "Pass", performed_by: "USR-014", verified_by: "USR-013", reject_reason: null, retry_count: 0, created_date: new Date("2026-03-09"), modified_date: new Date("2026-03-15") },
  { test_id: "TEST-027", lot_id: "LOT-025", test_type: "Microbial", test_method: "USP <2023>", test_date: new Date("2026-03-10"), test_result: "TAMC < 100 CFU/g, pathogens absent", acceptance_criteria: "TAMC ≤ 1000 CFU/g", result_status: "Pass", performed_by: "USR-018", verified_by: "USR-013", reject_reason: null, retry_count: 0, created_date: new Date("2026-03-10"), modified_date: new Date("2026-03-15") },
  { test_id: "TEST-028", lot_id: "LOT-026", test_type: "Physical", test_method: "Hardness Test", test_date: new Date("2026-03-11"), test_result: "Tablet hardness 80-100 N, within range", acceptance_criteria: "60-120 N", result_status: "Pass", performed_by: "USR-007", verified_by: "USR-013", reject_reason: null, retry_count: 0, created_date: new Date("2026-03-11"), modified_date: new Date("2026-03-15") },
  { test_id: "TEST-029", lot_id: "LOT-027", test_type: "Identity", test_method: "HPLC", test_date: new Date("2026-02-11"), test_result: "Vitamin C identity confirmed, archived", acceptance_criteria: "Retention time 3.2 ± 0.2 min", result_status: "Pass", performed_by: "USR-008", verified_by: "USR-013", reject_reason: null, retry_count: 0, created_date: new Date("2026-02-11"), modified_date: new Date("2026-03-15") },
  { test_id: "TEST-030", lot_id: "LOT-030", test_type: "Potency", test_method: "Atomic Absorption", test_date: new Date("2026-03-05"), test_result: "Iron content 98.8% of labeled amount", acceptance_criteria: "90.0-110.0%", result_status: "Pass", performed_by: "USR-014", verified_by: "USR-013", reject_reason: null, retry_count: 0, created_date: new Date("2026-03-05"), modified_date: new Date("2026-03-15") }
]);

print(">>> All seed data inserted successfully!");
print(">>> Pharmacy Inventory Management System initialized with:");
print("    - 20 users");
print("    - 25 materials");
print("    - 30 inventory lots");
print("    - 35 inventory transactions");
print("    - 25 production batches");
print("    - 30 batch components");
print("    - 30 QC tests");
print(">>> Database initialization completed at: " + new Date());
