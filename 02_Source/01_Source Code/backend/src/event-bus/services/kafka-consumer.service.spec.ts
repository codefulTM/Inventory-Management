import { ConfigService } from '@nestjs/config';
import * as KafkaJS from 'kafkajs';
import { KafkaConsumerService } from './kafka-consumer.service';
import { EventType } from '../events';

jest.mock('kafkajs', () => {
  const connect = jest.fn();
  const disconnect = jest.fn();
  const subscribe = jest.fn();
  const run = jest.fn();
  const consumer = jest.fn(() => ({
    connect,
    disconnect,
    subscribe,
    run,
  }));

  const Kafka = jest.fn(() => ({
    consumer,
  }));

  return {
    Kafka,
  };
});

describe('KafkaConsumerService', () => {
  let service: KafkaConsumerService;
  let configService: ConfigService;
  let mockConsumer: {
    connect: jest.Mock;
    disconnect: jest.Mock;
    subscribe: jest.Mock;
    run: jest.Mock;
  };

  beforeEach(() => {
    configService = {
      get: jest.fn((key: string, defaultValue: unknown) => {
        const values: Record<string, unknown> = {
          KAFKA_BROKERS: ['localhost:9092'],
          KAFKA_CONSUMER_GROUP: 'test-group',
        };

        return values[key] ?? defaultValue;
      }),
    } as unknown as ConfigService;

    mockConsumer = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      subscribe: jest.fn().mockResolvedValue(undefined),
      run: jest.fn().mockResolvedValue(undefined),
    };

    const kafkaConstructor = KafkaJS.Kafka as unknown as jest.Mock;
    kafkaConstructor.mockClear();
    kafkaConstructor.mockImplementation(() => ({
      consumer: jest.fn(() => mockConsumer),
    }));

    service = new KafkaConsumerService(configService);
  });

  it('should connect, subscribe, and start consuming on module init', async () => {
    await service.onModuleInit();

    expect(mockConsumer.connect).toHaveBeenCalledTimes(1);
    expect(mockConsumer.subscribe).toHaveBeenCalled();
    expect(mockConsumer.run).toHaveBeenCalledTimes(1);
    expect(service.isConsumerConnected()).toBe(true);
  });

  it('should register handler and process matching event', async () => {
    const handler = {
      eventType: EventType.INVENTORY_LOT_CREATED,
      handle: jest.fn().mockResolvedValue(undefined),
    };

    service.registerHandler(handler);

    await (service as any).handleEvent({
      eventId: 'evt-1',
      eventType: EventType.INVENTORY_LOT_CREATED,
      source: 'inventory-service',
      timestamp: new Date(),
      data: { lotId: 'LOT-1' },
    });

    expect(handler.handle).toHaveBeenCalledTimes(1);
  });

  it('should ignore events with no registered handlers', async () => {
    await expect(
      (service as any).handleEvent({
        eventId: 'evt-2',
        eventType: EventType.MATERIAL_CREATED,
        source: 'material-service',
        timestamp: new Date(),
        data: { materialId: 'MAT-1' },
      }),
    ).resolves.not.toThrow();
  });

  it('should route consumed message to eachMessage callback', async () => {
    const handler = {
      eventType: EventType.BATCH_CREATED,
      handle: jest.fn().mockResolvedValue(undefined),
    };
    service.registerHandler(handler);

    await service.onModuleInit();

    const runConfig = mockConsumer.run.mock.calls[0][0];
    await runConfig.eachMessage({
      topic: 'batch-events',
      partition: 0,
      message: {
        value: Buffer.from(
          JSON.stringify({
            eventId: 'evt-3',
            eventType: EventType.BATCH_CREATED,
            source: 'batch-service',
            timestamp: new Date().toISOString(),
            data: { batchId: 'BATCH-9' },
          }),
        ),
      },
    });

    expect(handler.handle).toHaveBeenCalledTimes(1);
  });

  it('should disconnect on module destroy', async () => {
    await service.connect();
    await service.onModuleDestroy();

    expect(mockConsumer.disconnect).toHaveBeenCalledTimes(1);
    expect(service.isConsumerConnected()).toBe(false);
  });
});
