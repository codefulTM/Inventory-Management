/**
 * Kafka Consumer Service
 * Handles subscribing to and consuming events from Kafka topics
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as KafkaJS from 'kafkajs';
import { BaseEvent, EventType } from '../events/event.types';

export interface EventHandler {
  eventType: EventType;
  handle(event: BaseEvent): Promise<void>;
}

@Injectable()
export class KafkaConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaConsumerService.name);
  private consumer!: KafkaJS.Consumer;
  private kafka!: KafkaJS.Kafka;
  private isConnected = false;
  private eventHandlers: Map<EventType, EventHandler[]> = new Map();

  constructor(private configService: ConfigService) {
    this.initializeKafka();
  }

  private initializeKafka(): void {
    const brokers = this.configService.get<string[]>(
      'KAFKA_BROKERS',
      ['localhost:9092'],
    );

    this.kafka = new KafkaJS.Kafka({
      clientId: this.configService.get<string>(
        'KAFKA_CONSUMER_GROUP',
        'inventory-app-consumer',
      ),
      brokers,
      retry: {
        initialRetryTime: 300,
        retries: 8,
        maxRetryTime: 30000,
      },
    });

    this.consumer = this.kafka.consumer({
      groupId: this.configService.get<string>(
        'KAFKA_CONSUMER_GROUP',
        'inventory-app-consumer-group',
      ),
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
    });
  }

  /**
   * Initialize and start consuming messages
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.connect();
      await this.subscribeToTopics();
      await this.startConsuming();
    } catch (error) {
      this.logger.error('Error initializing Kafka Consumer:', error);
      // Don't throw - let the app continue; consumer can be manually started
    }
  }

  /**
   * Cleanup on module destroy
   */
  async onModuleDestroy(): Promise<void> {
    await this.disconnect();
  }

  /**
   * Connect to Kafka broker
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      await this.consumer.connect();
      this.isConnected = true;
      this.logger.log('Kafka Consumer connected successfully');
    } catch (error) {
      this.logger.error('Failed to connect Kafka Consumer:', error);
      throw error;
    }
  }

  /**
   * Disconnect from Kafka broker
   */
  async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await this.consumer.disconnect();
      this.isConnected = false;
      this.logger.log('Kafka Consumer disconnected');
    } catch (error) {
      this.logger.error('Failed to disconnect Kafka Consumer:', error);
    }
  }

  /**
   * Register an event handler
   */
  registerHandler(handler: EventHandler): void {
    const handlers = this.eventHandlers.get(handler.eventType) || [];
    handlers.push(handler);
    this.eventHandlers.set(handler.eventType, handlers);

    this.logger.debug(
      `Registered handler for event type: ${handler.eventType}`,
    );
  }

  /**
   * Subscribe to topics based on event types
   */
  private async subscribeToTopics(): Promise<void> {
    const topics = [
      'inventory-events',
      'qc-events',
      'batch-events',
      'material-events',
      'user-events',
      'system-events',
    ];

    for (const topic of topics) {
      try {
        await this.consumer.subscribe({
          topic,
          fromBeginning: false,
        });
        this.logger.log(`Subscribed to topic: ${topic}`);
      } catch (error) {
        this.logger.warn(`Failed to subscribe to topic ${topic}:`, error);
      }
    }
  }

  /**
   * Start consuming messages from Kafka
   */
  private async startConsuming(): Promise<void> {
    try {
      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            if (!message.value) {
              this.logger.warn(`Empty message received from topic: ${topic}`);
              return;
            }

            const event = JSON.parse(message.value.toString()) as BaseEvent;
            await this.handleEvent(event);
          } catch (error) {
            this.logger.error(
              `Error processing message from topic ${topic}:`,
              error,
            );
          }
        },
      });

      this.logger.log('Kafka Consumer started consuming messages');
    } catch (error) {
      this.logger.error('Error starting Kafka Consumer:', error);
      throw error;
    }
  }

  /**
   * Handle an event by routing it to registered handlers
   */
  private async handleEvent(event: BaseEvent): Promise<void> {
    const handlers = this.eventHandlers.get(event.eventType);

    if (!handlers || handlers.length === 0) {
      this.logger.debug(
        `No handlers registered for event type: ${event.eventType}`,
      );
      return;
    }

    this.logger.debug(`Processing event: ${event.eventType} (ID: ${event.eventId})`);

    const results = await Promise.allSettled(
      handlers.map((handler) => handler.handle(event)),
    );

    // Log any handler failures
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        this.logger.error(
          `Handler ${index} failed for event ${event.eventId}:`,
          result.reason,
        );
      }
    });
  }

  /**
   * Get consumer status
   */
  isConsumerConnected(): boolean {
    return this.isConnected;
  }
}
