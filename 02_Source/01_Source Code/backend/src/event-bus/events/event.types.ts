/**
 * Base Event Interface and Types
 * Defines the structure for all system events
 */

export interface BaseEvent {
  eventId: string;
  eventType: EventType;
  timestamp: Date;
  source: string;
  correlationId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export enum EventType {
  // Inventory Events
  INVENTORY_LOT_CREATED = 'inventory_lot_created',
  INVENTORY_LOT_UPDATED = 'inventory_lot_updated',
  INVENTORY_LOT_STATUS_CHANGED = 'inventory_lot_status_changed',
  INVENTORY_LOT_DELETED = 'inventory_lot_deleted',

  // Inventory Transaction Events
  TRANSACTION_CREATED = 'transaction_created',
  TRANSACTION_COMPLETED = 'transaction_completed',

  // Material Events
  MATERIAL_CREATED = 'material_created',
  MATERIAL_UPDATED = 'material_updated',
  MATERIAL_DELETED = 'material_deleted',

  // QC Events
  QC_TEST_CREATED = 'qc_test_created',
  QC_TEST_COMPLETED = 'qc_test_completed',
  QC_TEST_PASSED = 'qc_test_passed',
  QC_TEST_FAILED = 'qc_test_failed',

  // Production Batch Events
  BATCH_CREATED = 'batch_created',
  BATCH_UPDATED = 'batch_updated',
  BATCH_COMPONENT_ADDED = 'batch_component_added',
  BATCH_COMPLETED = 'batch_completed',

  // User Events
  USER_CREATED = 'user_created',
  USER_UPDATED = 'user_updated',
  USER_DELETED = 'user_deleted',

  // System Events
  SYSTEM_ERROR = 'system_error',
  SYSTEM_ALERT = 'system_alert',
}

/**
 * Severity levels for events
 */
export enum EventSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}
