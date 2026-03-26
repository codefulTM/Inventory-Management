/**
 * Production Batch-related Event DTOs
 */

import { BaseEvent, EventType } from './event.types';

export interface BatchCreatedEvent extends BaseEvent {
  eventType: EventType.BATCH_CREATED;
  data: {
    batchId: string;
    productId: string;
    plannedQuantity: number;
    status: string;
  };
}

export interface BatchUpdatedEvent extends BaseEvent {
  eventType: EventType.BATCH_UPDATED;
  data: {
    batchId: string;
    updates: Record<string, any>;
  };
}

export interface BatchComponentAddedEvent extends BaseEvent {
  eventType: EventType.BATCH_COMPONENT_ADDED;
  data: {
    batchId: string;
    componentId: string;
    materialId: string;
    plannedQuantity: number;
  };
}

export interface BatchCompletedEvent extends BaseEvent {
  eventType: EventType.BATCH_COMPLETED;
  data: {
    batchId: string;
    productId: string;
    actualQuantity: number;
    completedDate: Date;
  };
}

// Union type for all batch events
export type BatchEvent =
  | BatchCreatedEvent
  | BatchUpdatedEvent
  | BatchComponentAddedEvent
  | BatchCompletedEvent;
