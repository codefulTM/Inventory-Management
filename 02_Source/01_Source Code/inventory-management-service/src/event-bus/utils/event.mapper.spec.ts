import { EventType } from '../events';
import {
  createBaseEvent,
  mapBatchCompletedEvent,
  mapInventoryLotCreatedEvent,
} from './event.mapper';

describe('event.mapper', () => {
  it('should create base event with metadata payload', () => {
    const event = createBaseEvent(EventType.SYSTEM_ALERT, 'test-source', {
      scope: 'health',
    });

    expect(event.eventType).toBe(EventType.SYSTEM_ALERT);
    expect(event.source).toBe('test-source');
    expect(event.metadata).toEqual({ scope: 'health' });
    expect(event.eventId).toBeDefined();
  });

  it('should map batch completed payload into event DTO', () => {
    const event = mapBatchCompletedEvent({
      batchId: 'B-100',
      productId: 'M-500',
      actualQuantity: 120,
      source: 'production-batch',
    });

    expect(event.eventType).toBe(EventType.BATCH_COMPLETED);
    expect(event.data.batchId).toBe('B-100');
    expect(event.data.actualQuantity).toBe(120);
    expect(event.data.completedDate).toBeInstanceOf(Date);
  });

  it('should map inventory lot created payload into event DTO', () => {
    const event = mapInventoryLotCreatedEvent({
      lotId: 'LOT-01',
      materialId: 'MAT-01',
      quantity: 30,
      status: 'Quarantine',
      source: 'inventory-lot',
    });

    expect(event.eventType).toBe(EventType.INVENTORY_LOT_CREATED);
    expect(event.data.lotId).toBe('LOT-01');
    expect(event.data.materialId).toBe('MAT-01');
    expect(event.data.quantity).toBe(30);
  });
});
