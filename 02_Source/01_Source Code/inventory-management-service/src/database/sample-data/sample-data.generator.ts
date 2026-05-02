/**
 * SampleDataGenerator - Sinh dữ liệu mẫu deterministically cho hệ thống IMS
 *
 * Chức năng:
 * - Tạo dữ liệu mẫu cho tất cả các collections chính của hệ thống
 * - Sử dụng seeded RNG để đảm bảo dữ liệu sinh ra giống nhau với cùng seed
 * - Hỗ trợ 3 profile: small, medium, large (khác nhau về số lượng record)
 *
 * Collections được sinh:
 * - users: 6 user mẫu (Manager, Operator x2, QC x2, IT Admin)
 * - materials: Vật tư (API, Excipient, Container...)
 * - inventory_lots: Lô hàng tồn kho với hạn sử dụng
 * - inventory_transactions: Giao dịch nhập/xuất kho
 * - qc_tests: Kết quả kiểm tra chất lượng
 * - inventory_audit_reports: Báo cáo kiểm kê
 * - import_export_orders: Đơn nhập/xuất
 * - production_batches: Lô sản xuất
 * - batch_components: Thành phần của lô sản xuất
 *
 * Sử dụng: Cho testing, development, demo
 */
export type SampleDataProfile = 'small' | 'medium' | 'large';

export type SampleCollectionName =
  | 'users'
  | 'materials'
  | 'inventory_lots'
  | 'inventory_transactions'
  | 'qc_tests'
  | 'inventory_audit_reports'
  | 'import_export_orders'
  | 'production_batches'
  | 'batch_components';

export type SampleDataset = Record<
  SampleCollectionName,
  Record<string, unknown>[]
>;

export type GenerateSampleDataOptions = {
  profile: SampleDataProfile;
  seed: string;
  now?: Date;
};

type ProfileCounts = {
  materials: number;
  lots: number;
  transactions: number;
  qcTests: number;
  auditReports: number;
  orders: number;
  batches: number;
  batchComponents: number;
};

const PROFILE_COUNTS: Record<SampleDataProfile, ProfileCounts> = {
  small: {
    materials: 12,
    lots: 40,
    transactions: 140,
    qcTests: 60,
    auditReports: 12,
    orders: 20,
    batches: 20,
    batchComponents: 40,
  },
  medium: {
    materials: 30,
    lots: 150,
    transactions: 650,
    qcTests: 220,
    auditReports: 36,
    orders: 90,
    batches: 85,
    batchComponents: 180,
  },
  large: {
    materials: 60,
    lots: 450,
    transactions: 2600,
    qcTests: 900,
    auditReports: 90,
    orders: 320,
    batches: 250,
    batchComponents: 700,
  },
};

const MATERIAL_TYPES = [
  'API',
  'Excipient',
  'Dietary Supplement',
  'Container',
  'Closure',
  'Process Chemical',
  'Testing Material',
];
const LOT_STATUSES = ['Quarantine', 'Accepted', 'Rejected', 'Depleted'];
const TRANSACTION_TYPES = [
  'Receipt',
  'Usage',
  'Split',
  'Adjustment',
  'Transfer',
  'Disposal',
];
const QC_TYPES = [
  'Identity',
  'Potency',
  'Microbial',
  'Growth Promotion',
  'Physical',
  'Chemical',
];
const QC_RESULTS = ['Pass', 'Fail', 'Pending'];
const ORDER_TYPES = ['Inbound', 'Outbound'];
const ORDER_STATUSES = ['PendingConfirmation', 'Confirmed', 'Rejected'];
const BATCH_STATUSES = ['In Progress', 'Complete', 'On Hold', 'Cancelled'];
const AUDIT_STATUSES = ['PENDING', 'PROCESSING', 'READY', 'FAILED'];

/**
 * Hàm hash seed - Chuyển chuỗi seed thành số nguyên dương
 * Sử dụng FNV-1a hash algorithm
 */
function hashSeed(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Tạo hàm random number generator (RNG) từ seed
 * Sử dụng mulberry32 algorithm - nhanh và deterministically
 * @returns Hàm trả về số ngẫu nhiên trong khoảng [0, 1)
 */
function createRng(seed: number): () => number {
  let value = seed || 1;
  return () => {
    value += 0x6d2b79f5;
    let output = value;
    output = Math.imul(output ^ (output >>> 15), output | 1);
    output ^= output + Math.imul(output ^ (output >>> 7), output | 61);
    return ((output ^ (output >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, items: T[]): T {
  return items[Math.floor(rng() * items.length)];
}

function randomInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function randomDateBetween(
  rng: () => number,
  start: Date,
  end: Date,
): Date {
  const startMs = start.getTime();
  const endMs = end.getTime();
  return new Date(startMs + rng() * (endMs - startMs));
}

function toIsoDate(input: Date): Date {
  return new Date(input.toISOString());
}

/**
 * Sinh toàn bộ dataset mẫu cho tất cả collections
 * @param options - Profile, seed, và thời điểm hiện tại (now)
 * @returns Object chứa mảng documents cho mỗi collection
 */
export function generateSampleDataset(
  options: GenerateSampleDataOptions,
): SampleDataset {
  const { profile, seed, now = new Date() } = options;
  const counts = PROFILE_COUNTS[profile];
  const rng = createRng(hashSeed(`${profile}:${seed}`));

  const windowEnd = toIsoDate(now);
  const windowStart = new Date(windowEnd);
  windowStart.setUTCDate(windowStart.getUTCDate() - 180);

  const users: Record<string, unknown>[] = [
    {
      user_id: 'USR-MGR-001',
      username: 'manager.demo',
      email: 'manager.demo@inventory.local',
      role: 'Manager',
      is_active: true,
      created_date: windowStart,
      modified_date: windowEnd,
      last_login: windowEnd,
    },
    {
      user_id: 'USR-OP-001',
      username: 'operator.a',
      email: 'operator.a@inventory.local',
      role: 'Operator',
      is_active: true,
      created_date: windowStart,
      modified_date: windowEnd,
      last_login: windowEnd,
    },
    {
      user_id: 'USR-OP-002',
      username: 'operator.b',
      email: 'operator.b@inventory.local',
      role: 'Operator',
      is_active: true,
      created_date: windowStart,
      modified_date: windowEnd,
      last_login: windowEnd,
    },
    {
      user_id: 'USR-QC-001',
      username: 'qc.primary',
      email: 'qc.primary@inventory.local',
      role: 'Quality Control Technician',
      is_active: true,
      created_date: windowStart,
      modified_date: windowEnd,
      last_login: windowEnd,
    },
    {
      user_id: 'USR-QC-002',
      username: 'qc.secondary',
      email: 'qc.secondary@inventory.local',
      role: 'Quality Control Technician',
      is_active: true,
      created_date: windowStart,
      modified_date: windowEnd,
      last_login: windowEnd,
    },
    {
      user_id: 'USR-ITA-001',
      username: 'it.admin',
      email: 'it.admin@inventory.local',
      role: 'IT Administrator',
      is_active: true,
      created_date: windowStart,
      modified_date: windowEnd,
      last_login: windowEnd,
    },
  ];

  const materials: Record<string, unknown>[] = [];
  for (let index = 1; index <= counts.materials; index += 1) {
    const createdDate = randomDateBetween(rng, windowStart, windowEnd);
    materials.push({
      material_id: `MAT-${index.toString().padStart(4, '0')}`,
      part_number: `PN-${index.toString().padStart(5, '0')}`,
      material_name: `Material ${index}`,
      material_type: pick(rng, MATERIAL_TYPES),
      storage_conditions: pick(rng, ['2-8C', '15-25C', 'Dry place']),
      specification_document: `SPEC-${index.toString().padStart(4, '0')}`,
      created_by: 'USR-MGR-001',
      approved_by: rng() > 0.2 ? 'USR-MGR-001' : null,
      status: rng() > 0.15 ? 'Approved' : 'Pending',
      created_date: createdDate,
      modified_date: randomDateBetween(rng, createdDate, windowEnd),
    });
  }

  const inventoryLots: Record<string, unknown>[] = [];
  for (let index = 1; index <= counts.lots; index += 1) {
    const material = materials[index % materials.length];
    const receivedDate = randomDateBetween(rng, windowStart, windowEnd);
    const expirationDate = new Date(receivedDate);
    expirationDate.setUTCDate(expirationDate.getUTCDate() + randomInt(rng, 90, 720));

    inventoryLots.push({
      lot_id: `LOT-${index.toString().padStart(5, '0')}`,
      material_id: material.material_id,
      manufacturer_name: `Manufacturer ${randomInt(rng, 1, 25)}`,
      manufacturer_lot: `MFG-${randomInt(rng, 10000, 99999)}`,
      supplier_name: `Supplier ${randomInt(rng, 1, 18)}`,
      received_date: receivedDate,
      expiration_date: expirationDate,
      in_use_expiration_date: null,
      status: pick(rng, LOT_STATUSES),
      quantity: randomInt(rng, 25, 2000),
      unit_of_measure: pick(rng, ['kg', 'g', 'L', 'pcs']),
      warehouse_id: `WH-${randomInt(rng, 1, 5).toString().padStart(2, '0')}`,
      storage_location: `A-${randomInt(rng, 1, 20)}`,
      is_sample: rng() < 0.08,
      parent_lot_id: null,
      notes: null,
      received_by: pick(rng, ['USR-OP-001', 'USR-OP-002']),
      qc_by: pick(rng, ['USR-QC-001', 'USR-QC-002']),
      history: [],
      created_date: receivedDate,
      modified_date: randomDateBetween(rng, receivedDate, windowEnd),
    });
  }

  const inventoryTransactions: Record<string, unknown>[] = [];
  for (let index = 1; index <= counts.transactions; index += 1) {
    const lot = inventoryLots[index % inventoryLots.length];
    const transactionDate = randomDateBetween(rng, windowStart, windowEnd);
    const type = pick(rng, TRANSACTION_TYPES);

    inventoryTransactions.push({
      transaction_id: `TRX-${index.toString().padStart(7, '0')}`,
      lot_id: lot.lot_id,
      material_id: lot.material_id,
      related_lot_id: rng() < 0.15 ? inventoryLots[randomInt(rng, 0, inventoryLots.length - 1)].lot_id : null,
      transaction_type: type,
      quantity: randomInt(rng, 1, 250),
      unit_of_measure: lot.unit_of_measure,
      transaction_date: transactionDate,
      reference_number: `${type.substring(0, 3).toUpperCase()}-${randomInt(rng, 100000, 999999)}`,
      performed_by: pick(rng, ['USR-OP-001', 'USR-OP-002', 'USR-MGR-001']),
      notes: null,
      created_date: transactionDate,
      modified_date: randomDateBetween(rng, transactionDate, windowEnd),
    });
  }

  const qcTests: Record<string, unknown>[] = [];
  for (let index = 1; index <= counts.qcTests; index += 1) {
    const lot = inventoryLots[index % inventoryLots.length];
    const testDate = randomDateBetween(rng, windowStart, windowEnd);
    const resultStatus = pick(rng, QC_RESULTS);

    qcTests.push({
      test_id: `QCT-${index.toString().padStart(6, '0')}`,
      lot_id: lot.lot_id,
      supplier_name: lot.supplier_name,
      material_id: lot.material_id,
      test_type: pick(rng, QC_TYPES),
      test_method: `Method-${randomInt(rng, 1, 12)}`,
      test_date: testDate,
      test_result: resultStatus === 'Pass' ? 'Compliant' : resultStatus === 'Fail' ? 'Out of spec' : 'Awaiting completion',
      acceptance_criteria: 'As per SOP-QC-01',
      result_status: resultStatus,
      performed_by: pick(rng, ['USR-QC-001', 'USR-QC-002']),
      verified_by: 'USR-MGR-001',
      reject_reason: resultStatus === 'Fail' ? 'Out of range value' : null,
      approved_by: resultStatus === 'Pass' ? 'USR-MGR-001' : null,
      history: [],
      created_date: testDate,
      modified_date: randomDateBetween(rng, testDate, windowEnd),
    });
  }

  const auditReports: Record<string, unknown>[] = [];
  for (let index = 1; index <= counts.auditReports; index += 1) {
    const createdDate = randomDateBetween(rng, windowStart, windowEnd);
    const periodFrom = new Date(createdDate);
    periodFrom.setUTCDate(periodFrom.getUTCDate() - 30);

    auditReports.push({
      report_id: `AR-${index.toString().padStart(5, '0')}`,
      period_from: periodFrom,
      period_to: createdDate,
      scope_warehouse_ids: [`WH-0${randomInt(rng, 1, 5)}`],
      report_template_code: 'STATUTORY_V1',
      status: pick(rng, AUDIT_STATUSES),
      summary_total_items: randomInt(rng, 40, 300),
      summary_total_quantity: randomInt(rng, 1000, 15000),
      summary_total_value: randomInt(rng, 20000, 500000),
      requested_by: 'USR-MGR-001',
      approved_by: rng() > 0.4 ? 'USR-MGR-001' : null,
      note: null,
      failure_reason: null,
      created_date: createdDate,
      modified_date: randomDateBetween(rng, createdDate, windowEnd),
      action: pick(rng, ['CREATE_REPORT', 'REVIEW_REPORT', 'EXPORT_REPORT']),
      entity: 'inventory_audit_report',
      performed_by: 'USR-MGR-001',
      performed_at: createdDate,
      details: {
        profile,
        seed,
      },
    });
  }

  const importExportOrders: Record<string, unknown>[] = [];
  for (let index = 1; index <= counts.orders; index += 1) {
    const createdDate = randomDateBetween(rng, windowStart, windowEnd);
    const orderType = pick(rng, ORDER_TYPES);
    const itemCount = randomInt(rng, 1, 5);
    const items: Record<string, unknown>[] = [];

    for (let itemIndex = 0; itemIndex < itemCount; itemIndex += 1) {
      const material = materials[randomInt(rng, 0, materials.length - 1)];
      items.push({
        material_id: material.material_id,
        lot_id: inventoryLots[randomInt(rng, 0, inventoryLots.length - 1)].lot_id,
        quantity: randomInt(rng, 5, 120),
        unit_of_measure: pick(rng, ['kg', 'g', 'L', 'pcs']),
        expected_location: `A-${randomInt(rng, 1, 20)}`,
      });
    }

    importExportOrders.push({
      order_id: `ORD-${index.toString().padStart(6, '0')}`,
      order_type: orderType,
      status: pick(rng, ORDER_STATUSES),
      warehouse_id: `WH-${randomInt(rng, 1, 5).toString().padStart(2, '0')}`,
      reason: orderType === 'Outbound' ? 'Production request' : 'Supplier receipt',
      reference_number: `REF-${randomInt(rng, 10000, 99999)}`,
      created_by: pick(rng, ['USR-OP-001', 'USR-OP-002', 'USR-MGR-001']),
      items,
      attachments: [],
      confirmed_by: rng() > 0.45 ? 'USR-MGR-001' : null,
      confirmed_at: rng() > 0.45 ? randomDateBetween(rng, createdDate, windowEnd) : null,
      confirm_note: null,
      blind_count_required: rng() < 0.6,
      confirmed_items: [],
      created_date: createdDate,
      modified_date: randomDateBetween(rng, createdDate, windowEnd),
    });
  }

  const productionBatches: Record<string, unknown>[] = [];
  for (let index = 1; index <= counts.batches; index += 1) {
    const createdDate = randomDateBetween(rng, windowStart, windowEnd);
    productionBatches.push({
      batch_id: `BATCH-${index.toString().padStart(5, '0')}`,
      product_id: `PRD-${randomInt(rng, 1, 40).toString().padStart(4, '0')}`,
      batch_number: `BN-${index.toString().padStart(5, '0')}`,
      unit_of_measure: pick(rng, ['kg', 'g', 'L']),
      shelf_life_value: randomInt(rng, 6, 36),
      shelf_life_unit: 'month',
      status: pick(rng, BATCH_STATUSES),
      batch_size: randomInt(rng, 100, 6000),
      created_by: 'USR-MGR-001',
      approved_by: rng() > 0.55 ? 'USR-MGR-001' : null,
      completed_by: rng() > 0.55 ? 'USR-MGR-001' : null,
      created_date: createdDate,
      modified_date: randomDateBetween(rng, createdDate, windowEnd),
    });
  }

  const batchComponents: Record<string, unknown>[] = [];
  for (let index = 1; index <= counts.batchComponents; index += 1) {
    const batch = productionBatches[index % productionBatches.length];
    const lot = inventoryLots[index % inventoryLots.length];
    const additionDate = randomDateBetween(rng, windowStart, windowEnd);

    batchComponents.push({
      component_id: `COMP-${index.toString().padStart(6, '0')}`,
      batch_id: batch.batch_id,
      lot_id: lot.lot_id,
      planned_quantity: randomInt(rng, 5, 300),
      actual_quantity: randomInt(rng, 3, 320),
      unit_of_measure: pick(rng, ['kg', 'g', 'L']),
      addition_date: additionDate,
      added_by: pick(rng, ['USR-OP-001', 'USR-OP-002']),
      created_date: additionDate,
      modified_date: randomDateBetween(rng, additionDate, windowEnd),
    });
  }

  return {
    users,
    materials,
    inventory_lots: inventoryLots,
    inventory_transactions: inventoryTransactions,
    qc_tests: qcTests,
    inventory_audit_reports: auditReports,
    import_export_orders: importExportOrders,
    production_batches: productionBatches,
    batch_components: batchComponents,
  };
}

export function getProfileCounts(profile: SampleDataProfile): ProfileCounts {
  return PROFILE_COUNTS[profile];
}
