/**
 * Kafka Producer Service
 * Handles publishing events to Kafka topics
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as KafkaJS from 'kafkajs';
import { v4 as uuidv4 } from 'uuid';
import { BaseEvent, EventType } from '../events/event.types';

@Injectable()
export class KafkaProducerService {
  private readonly logger = new Logger(KafkaProducerService.name);
  private producer!: KafkaJS.Producer;
  private kafka!: KafkaJS.Kafka;
  private isConnected = false;

  constructor(private configService: ConfigService) {
    this.initializeKafka();
  }

  private initializeKafka(): void {
    const brokers = this.configService.get<string[]>(
      'KAFKA_BROKERS',
      ['localhost:9092'],
    );

    this.kafka = new KafkaJS.Kafka({
      clientId: this.configService.get<string>('KAFKA_CLIENT_ID', 'inventory-app'),
      brokers,
      retry: {
        initialRetryTime: 300,
        retries: 8,
        maxRetryTime: 30000,
      },
    });

    this.producer = this.kafka.producer({
      allowAutoTopicCreation: true,
      transactionTimeout: 30000,
    });
  }

  /**
   * Connect to Kafka broker
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      await this.producer.connect();
      this.isConnected = true;
      this.logger.log('Kafka Producer connected successfully');
    } catch (error) {
      this.logger.error('Failed to connect Kafka Producer:', error);
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
      await this.producer.disconnect();
      this.isConnected = false;
      this.logger.log('Kafka Producer disconnected');
    } catch (error) {
      this.logger.error('Failed to disconnect Kafka Producer:', error);
    }
  }

  /**
   * Publish an event to Kafka topic
   * @param event The event to publish
   * @returns Topic partition information
   */
  async publishEvent(event: BaseEvent): Promise<KafkaJS.RecordMetadata[]> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      // Add eventId if not present
      if (!event.eventId) {
        (event as any).eventId = uuidv4();
      }

      // Add timestamp if not present
      if (!event.timestamp) {
        event.timestamp = new Date();
      }

      const topic = this.getTopicForEventType(event.eventType);
      const key = this.getKeyForEvent(event);

      this.logger.debug(
        `Publishing event: ${event.eventType} to topic: ${topic}`,
      );

      const result = await this.producer.send({
        topic,
        messages: [
          {
            key,
            value: JSON.stringify(event),
            headers: {
              'event-type': event.eventType,
              'event-id': event.eventId,
              'timestamp': event.timestamp.toISOString(),
            },
          },
        ],
      });

      this.logger.debug(`Event published successfully: ${event.eventId}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to publish event ${event.eventId}:`, error);
      throw error;
    }
  }

  /**
   * Publish multiple events in a batch
   */
  async publishBatch(events: BaseEvent[]): Promise<KafkaJS.RecordMetadata[][]> {
    if (events.length === 0) {
      return [];
    }

    const messagesByTopic: Record<string, KafkaJS.Message[]> = {};

    for (const event of events) {
      if (!event.eventId) {
        (event as any).eventId = uuidv4();
      }
      if (!event.timestamp) {
        event.timestamp = new Date();
      }

      const topic = this.getTopicForEventType(event.eventType);
      const key = this.getKeyForEvent(event);

      if (!messagesByTopic[topic]) {
        messagesByTopic[topic] = [];
      }

      messagesByTopic[topic].push({
        key,
        value: JSON.stringify(event),
        headers: {
          'event-type': event.eventType,
          'event-id': event.eventId,
          'timestamp': event.timestamp.toISOString(),
        },
      });
    }

    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const results: KafkaJS.RecordMetadata[][] = [];

      for (const [topic, messages] of Object.entries(messagesByTopic)) {
        const result = await this.producer.send({
          topic,
          messages,
        });
        results.push(result);
      }

      this.logger.debug(`Batch of ${events.length} events published successfully`);
      return results;
    } catch (error) {
      this.logger.error('Failed to publish batch:', error);
      throw error;
    }
  }

  /**
   * Determine the Kafka topic based on event type
   */
  private getTopicForEventType(eventType: EventType): string {
    // Map event types to topics for better organization
    if (
      eventType.startsWith('inventory_lot') ||
      eventType.startsWith('transaction')
    ) {
      return 'inventory-events';
    }
    if (eventType.startsWith('qc_test')) {
      return 'qc-events';
    }
    if (eventType.startsWith('batch')) {
      return 'batch-events';
    }
    if (eventType.startsWith('material')) {
      return 'material-events';
    }
    if (eventType.startsWith('user')) {
      return 'user-events';
    }
    return 'system-events';
  }

  /**
   * Determine partition key for the event
   * This helps distribute events and maintain order for related entities
   */
  private getKeyForEvent(event: BaseEvent): string {
    // Use entity ID if available in the data object
    const data = (event as any).data || {};
    
    if (data.lotId) {
      return data.lotId;
    }
    if (data.materialId) {
      return data.materialId;
    }
    if (data.batchId) {
      return data.batchId;
    }
    if (data.testId) {
      return data.testId;
    }
    if (data.userId) {
      return data.userId;
    }

    // Default to event source
    return event.source;
  }

  /**
   * Get producer status
   */
  isProducerConnected(): boolean {
    return this.isConnected;
  }
}
