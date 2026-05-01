import { Injectable } from '@nestjs/common';
import { EventHandlerService } from '../services/event-handler.service';
import type { BaseEvent } from '../events';
import { EventType } from '../events';

@Injectable()
export class BatchEventHandler extends EventHandlerService {
  getEventTypes(): EventType[] {
    return [
      EventType.BATCH_CREATED,
      EventType.BATCH_UPDATED,
      EventType.BATCH_COMPONENT_ADDED,
      EventType.BATCH_COMPLETED,
    ];
  }

  async handle(event: BaseEvent): Promise<void> {
    this.logHandling(event);
    this.logCompleted(event);
  }
}
