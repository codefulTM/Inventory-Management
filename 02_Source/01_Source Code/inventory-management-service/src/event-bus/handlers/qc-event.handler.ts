import { Injectable } from '@nestjs/common';
import { EventHandlerService } from '../services/event-handler.service';
import type { BaseEvent } from '../events';
import { EventType } from '../events';

@Injectable()
export class QcEventHandler extends EventHandlerService {
  getEventTypes(): EventType[] {
    return [EventType.QC_TEST_CREATED, EventType.QC_TEST_COMPLETED];
  }

  async handle(event: BaseEvent): Promise<void> {
    this.logHandling(event);
    this.logCompleted(event);
  }
}
