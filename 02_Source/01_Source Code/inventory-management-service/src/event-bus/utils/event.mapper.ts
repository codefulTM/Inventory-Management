import { EventType } from '../events';
import type { BaseEvent, BatchCompletedEvent, InventoryLotCreatedEvent } from '../events';

export function createBaseEvent(
  eventType: EventType,
  source: string,
  payload: Record<string, unknown> = {},
): BaseEvent {
  return {
    eventId: crypto.randomUUID(),
    eventType,
    timestamp: new Date(),
    source,
    metadata: payload,
  };
}

export function mapBatchCompletedEvent(input: {
  batchId: string;
  productId: string;
  actualQuantity: number;
  source: string;
}): BatchCompletedEvent {
  return {
    eventId: crypto.randomUUID(),
    eventType: EventType.BATCH_COMPLETED,
    timestamp: new Date(),
    source: input.source,
    data: {
      batchId: input.batchId,
      productId: input.productId,
      actualQuantity: input.actualQuantity,
      completedDate: new Date(),
    },
  };
}

export function mapInventoryLotCreatedEvent(input: {
  lotId: string;
  materialId: string;
  quantity: number;
  status: string;
  source: string;
}): InventoryLotCreatedEvent {
  return {
    eventId: crypto.randomUUID(),
    eventType: EventType.INVENTORY_LOT_CREATED,
    timestamp: new Date(),
    source: input.source,
    data: {
      lotId: input.lotId,
      materialId: input.materialId,
      quantity: input.quantity,
      status: input.status,
    },
  };
}
