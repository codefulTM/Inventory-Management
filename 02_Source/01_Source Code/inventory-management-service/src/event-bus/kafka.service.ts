import { Injectable, Logger } from '@nestjs/common';
import type { BaseEvent } from './events';

@Injectable()
export class KafkaService {
	private readonly logger = new Logger(KafkaService.name);
	private readonly publishedEvents: BaseEvent[] = [];

	async publish(event: BaseEvent): Promise<void> {
		this.publishedEvents.push(event);
		this.logger.debug(`Published event ${event.eventType} (${event.eventId})`);
	}

	getPublishedEvents(): BaseEvent[] {
		return [...this.publishedEvents];
	}

	clearPublishedEvents(): void {
		this.publishedEvents.length = 0;
	}
}
