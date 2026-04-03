import { Logger } from '@nestjs/common';
import type { BaseEvent } from '../events/event.types';
import type { EventType } from '../events/event.types';

export abstract class EventHandlerService {
  protected readonly logger = new Logger(this.constructor.name);

  abstract getEventTypes(): EventType[];

  abstract handle(event: BaseEvent): Promise<void>;

  protected logHandling(event: BaseEvent): void {
    this.logger.debug(
      `Handling event ${event.eventType} (${event.eventId}) from ${event.source}`,
    );
  }

  protected logCompleted(event: BaseEvent): void {
    this.logger.debug(`Handled event ${event.eventType} (${event.eventId})`);
  }

  protected logError(event: BaseEvent, error: Error): void {
    this.logger.error(
      `Failed handling event ${event.eventType} (${event.eventId}): ${error.message}`,
    );
  }
}
