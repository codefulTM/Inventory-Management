import type { BaseEvent } from './event.types';
import { EventType } from './event.types';

export interface InventoryLotCreatedEvent extends BaseEvent {
  eventType: EventType.INVENTORY_LOT_CREATED;
  data: {
    lotId: string;
    materialId: string;
    quantity: number;
    status: string;
  };
}

export interface InventoryLotUpdatedEvent extends BaseEvent {
  eventType: EventType.INVENTORY_LOT_UPDATED;
  data: {
    lotId: string;
    updates: Record<string, unknown>;
  };
}

export interface InventoryLotStatusChangedEvent extends BaseEvent {
  eventType: EventType.INVENTORY_LOT_STATUS_CHANGED;
  data: {
    lotId: string;
    fromStatus: string;
    toStatus: string;
  };
}

export interface InventoryTransactionCreatedEvent extends BaseEvent {
  eventType: EventType.TRANSACTION_CREATED;
  data: {
    transactionId: string;
    lotId: string;
    transactionType: string;
    quantity: number;
  };
}

export type InventoryEvent =
  | InventoryLotCreatedEvent
  | InventoryLotUpdatedEvent
  | InventoryLotStatusChangedEvent
  | InventoryTransactionCreatedEvent;
