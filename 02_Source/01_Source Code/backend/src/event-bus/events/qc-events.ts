import type { BaseEvent } from './event.types';
import { EventType } from './event.types';

export interface QCTestCreatedEvent extends BaseEvent {
  eventType: EventType.QC_TEST_CREATED;
  data: {
    testId: string;
    lotId: string;
    testType: string;
    resultStatus: string;
  };
}

export interface QCTestCompletedEvent extends BaseEvent {
  eventType: EventType.QC_TEST_COMPLETED;
  data: {
    testId: string;
    lotId: string;
    resultStatus: 'Pass' | 'Fail' | 'Pending';
    verifiedBy?: string;
  };
}

export type QcEvent = QCTestCreatedEvent | QCTestCompletedEvent;
