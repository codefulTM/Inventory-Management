export interface BaseEvent {
  eventId: string;
  eventType: EventType;
  timestamp: Date;
  source: string;
  correlationId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export enum EventType {
  INVENTORY_LOT_CREATED = 'inventory_lot_created',
  INVENTORY_LOT_UPDATED = 'inventory_lot_updated',
  INVENTORY_LOT_STATUS_CHANGED = 'inventory_lot_status_changed',
  INVENTORY_LOT_DELETED = 'inventory_lot_deleted',

  TRANSACTION_CREATED = 'transaction_created',
  TRANSACTION_COMPLETED = 'transaction_completed',

  MATERIAL_CREATED = 'material_created',
  MATERIAL_UPDATED = 'material_updated',
  MATERIAL_DELETED = 'material_deleted',

  QC_TEST_CREATED = 'qc_test_created',
  QC_TEST_COMPLETED = 'qc_test_completed',
  QC_TEST_PASSED = 'qc_test_passed',
  QC_TEST_FAILED = 'qc_test_failed',

  BATCH_CREATED = 'batch_created',
  BATCH_UPDATED = 'batch_updated',
  BATCH_COMPONENT_ADDED = 'batch_component_added',
  BATCH_COMPLETED = 'batch_completed',

  USER_CREATED = 'user_created',
  USER_UPDATED = 'user_updated',
  USER_DELETED = 'user_deleted',

  SYSTEM_ERROR = 'system_error',
  SYSTEM_ALERT = 'system_alert',
}

export enum EventSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}
