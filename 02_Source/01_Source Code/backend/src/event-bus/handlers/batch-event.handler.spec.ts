import { EventType } from '../events';
import { BatchEventHandler } from './batch-event.handler';

describe('BatchEventHandler', () => {
  it('should expose batch event types list', () => {
    const handler = new BatchEventHandler();

    expect(handler.getEventTypes()).toEqual([
      EventType.BATCH_CREATED,
      EventType.BATCH_UPDATED,
      EventType.BATCH_COMPONENT_ADDED,
      EventType.BATCH_COMPLETED,
    ]);
  });

  it('should handle batch event without throwing', async () => {
    const handler = new BatchEventHandler();

    await expect(
      handler.handle({
        eventId: 'evt-1',
        eventType: EventType.BATCH_CREATED,
        timestamp: new Date(),
        source: 'test',
      }),
    ).resolves.not.toThrow();
  });
});
