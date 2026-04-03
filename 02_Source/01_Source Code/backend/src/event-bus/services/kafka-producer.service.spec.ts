import { ConfigService } from '@nestjs/config';
import * as KafkaJS from 'kafkajs';
import { KafkaProducerService } from './kafka-producer.service';
import { EventType } from '../events';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-event-id'),
}));

jest.mock('kafkajs', () => {
  const send = jest.fn();
  const connect = jest.fn();
  const disconnect = jest.fn();
  const producer = jest.fn(() => ({
    connect,
    disconnect,
    send,
  }));

  const Kafka = jest.fn(() => ({
    producer,
  }));

  return {
    Kafka,
  };
});

describe('KafkaProducerService', () => {
  let service: KafkaProducerService;
  let configService: ConfigService;
  let mockProducer: {
    connect: jest.Mock;
    disconnect: jest.Mock;
    send: jest.Mock;
  };

  beforeEach(() => {
    configService = {
      get: jest.fn((key: string, defaultValue: unknown) => {
        const values: Record<string, unknown> = {
          KAFKA_BROKERS: ['localhost:9092'],
          KAFKA_CLIENT_ID: 'test-client',
        };

        return values[key] ?? defaultValue;
      }),
    } as unknown as ConfigService;

    service = new KafkaProducerService(configService);

    mockProducer = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      send: jest.fn().mockResolvedValue([{ partition: 0, offset: '1' }]),
    };

    const kafkaConstructor = KafkaJS.Kafka as unknown as jest.Mock;
    const kafkaInstance = kafkaConstructor.mock.results[0].value as {
      producer: jest.Mock;
    };
    kafkaInstance.producer.mockReturnValue(mockProducer);

    // Reinitialize to pick up the producer mock configured above.
    service = new KafkaProducerService(configService);
  });

  it('should connect and publish an event', async () => {
    const event = {
      eventType: EventType.INVENTORY_LOT_CREATED,
      source: 'inventory-service',
      data: { lotId: 'LOT-001' },
    } as any;

    const result = await service.publishEvent(event);

    expect(result).toEqual([{ partition: 0, offset: '1' }]);
    expect(mockProducer.connect).toHaveBeenCalledTimes(1);
    expect(mockProducer.send).toHaveBeenCalledTimes(1);

    const sendPayload = mockProducer.send.mock.calls[0][0];
    expect(sendPayload.topic).toBe('inventory-events');
    expect(sendPayload.messages[0].key).toBe('LOT-001');
    expect(sendPayload.messages[0].headers['event-type']).toBe(
      EventType.INVENTORY_LOT_CREATED,
    );
  });

  it('should map event types to topics for batch publish', async () => {
    const events = [
      {
        eventType: EventType.QC_TEST_CREATED,
        source: 'qc-service',
        data: { testId: 'TEST-1' },
      },
      {
        eventType: EventType.BATCH_CREATED,
        source: 'batch-service',
        data: { batchId: 'BATCH-1' },
      },
      {
        eventType: EventType.MATERIAL_CREATED,
        source: 'material-service',
        data: { materialId: 'MAT-1' },
      },
    ] as any[];

    await service.publishBatch(events);

    expect(mockProducer.send).toHaveBeenCalledTimes(3);
    const topics = mockProducer.send.mock.calls.map((call) => call[0].topic);
    expect(topics).toContain('qc-events');
    expect(topics).toContain('batch-events');
    expect(topics).toContain('material-events');
  });

  it('should return empty array when batch is empty', async () => {
    const result = await service.publishBatch([]);
    expect(result).toEqual([]);
    expect(mockProducer.send).not.toHaveBeenCalled();
  });

  it('should disconnect when connected', async () => {
    await service.connect();
    await service.disconnect();

    expect(mockProducer.disconnect).toHaveBeenCalledTimes(1);
    expect(service.isProducerConnected()).toBe(false);
  });
});
