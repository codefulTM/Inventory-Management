/**
 * Event Handler Service
 * Base service for implementing event handlers
 */

import { Logger } from '@nestjs/common';
import { BaseEvent, EventType } from '../events';

export abstract class EventHandlerService {
  protected readonly logger = new Logger(this.constructor.name);

  /**
   * Get the event types this handler is responsible for
   */
  abstract getEventTypes(): EventType[];

  /**
   * Handle the event
   */
  abstract handle(event: BaseEvent): Promise<void>;

  /**
   * Log event handling
   */
  protected logHandling(event: BaseEvent): void {
    this.logger.debug(
      `Handling event: ${event.eventType} (ID: ${event.eventId}, Source: ${event.source})`,
    );
  }

  /**
   * Log event handling completion
   */
  protected logCompleted(event: BaseEvent): void {
    this.logger.debug(
      `Completed handling event: ${event.eventType} (ID: ${event.eventId})`,
    );
  }

  /**
   * Log event handling error
   */
  protected logError(event: BaseEvent, error: Error): void {
    this.logger.error(
      `Error handling event ${event.eventType} (ID: ${event.eventId}):`,
      error.message,
    );
  }
}
