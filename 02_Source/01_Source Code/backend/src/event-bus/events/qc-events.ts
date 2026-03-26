/**
 * QC-related Event DTOs
 */

import { BaseEvent, EventType, EventSeverity } from './event.types';

export interface QCTestCreatedEvent extends BaseEvent {
  eventType: EventType.QC_TEST_CREATED;
  data: {
    testId: string;
    lotId: string;
    testType: string;
    scheduledDate: Date;
  };
}

export interface QCTestCompletedEvent extends BaseEvent {
  eventType: EventType.QC_TEST_COMPLETED;
  data: {
    testId: string;
    lotId: string;
    passed: boolean;
    result: string;
    notes?: string;
    completedDate: Date;
  };
}

export interface QCTestPassedEvent extends BaseEvent {
  eventType: EventType.QC_TEST_PASSED;
  data: {
    testId: string;
    lotId: string;
    severity: EventSeverity;
  };
}

export interface QCTestFailedEvent extends BaseEvent {
  eventType: EventType.QC_TEST_FAILED;
  data: {
    testId: string;
    lotId: string;
    reason: string;
    severity: EventSeverity;
    requiresRetesting: boolean;
  };
}

// Union type for all QC events
export type QCEvent =
  | QCTestCreatedEvent
  | QCTestCompletedEvent
  | QCTestPassedEvent
  | QCTestFailedEvent;
