/**
 * Inventory-related Event DTOs
 */

import { BaseEvent, EventType } from './event.types';

export interface InventoryLotCreatedEvent extends BaseEvent {
  eventType: EventType.INVENTORY_LOT_CREATED;
  data: {
    lotId: string;
    materialId: string;
    quantity: number;
    supplierId: string;
    receivedDate: Date;
    status: string;
  };
}

export interface InventoryLotStatusChangedEvent extends BaseEvent {
  eventType: EventType.INVENTORY_LOT_STATUS_CHANGED;
  data: {
    lotId: string;
    previousStatus: string;
    newStatus: string;
    reason?: string;
  };
}

export interface TransactionCreatedEvent extends BaseEvent {
  eventType: EventType.TRANSACTION_CREATED;
  data: {
    transactionId: string;
    lotId: string;
    transactionType: 'RECEIPT' | 'USAGE' | 'ADJUSTMENT';
    quantity: number;
    reason?: string;
  };
}

export interface MaterialCreatedEvent extends BaseEvent {
  eventType: EventType.MATERIAL_CREATED;
  data: {
    materialId: string;
    name: string;
    sku: string;
    category: string;
  };
}

// Union type for all inventory events
export type InventoryEvent =
  | InventoryLotCreatedEvent
  | InventoryLotStatusChangedEvent
  | TransactionCreatedEvent
  | MaterialCreatedEvent;
