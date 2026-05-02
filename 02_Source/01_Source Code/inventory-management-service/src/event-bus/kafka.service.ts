/**
 * KafkaService - Dịch vụ publish events (hiện tại dùng in-memory fallback)
 *
 * Chức năng:
 * - Lưu events vào mảng in-memory (chưa kết nối Kafka cluster thực)
 * - Cung cấp API để publish, lấy danh sách, và xóa events
 * - Dùng cho testing và development
 *
 * TODO: Nâng cấp để kết nối Kafka cluster thực tế trong production
 */
import { Injectable, Logger } from '@nestjs/common';
import type { BaseEvent } from './events';

/**
 * KafkaService - In-memory event publisher (fallback khi chưa có Kafka)
 */
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
