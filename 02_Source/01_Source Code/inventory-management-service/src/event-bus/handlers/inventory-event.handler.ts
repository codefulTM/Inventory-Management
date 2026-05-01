import { Injectable } from '@nestjs/common';
import { EventHandlerService } from '../services/event-handler.service';
import type { BaseEvent } from '../events';
import { EventType } from '../events';

@Injectable()
export class InventoryEventHandler extends EventHandlerService {
  getEventTypes(): EventType[] {
    return [
      EventType.INVENTORY_LOT_CREATED,
      EventType.INVENTORY_LOT_UPDATED,
      EventType.INVENTORY_LOT_STATUS_CHANGED,
      EventType.TRANSACTION_CREATED,
    ];
  }

  async handle(event: BaseEvent): Promise<void> {
    this.logHandling(event);
    this.logCompleted(event);
  }
}
