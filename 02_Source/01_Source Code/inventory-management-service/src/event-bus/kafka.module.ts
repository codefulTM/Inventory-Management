/**
 * KafkaModule - Module event bus sử dụng Kafka (hoặc in-memory fallback)
 *
 * Chức năng:
 * - Publish events khi có thay đổi dữ liệu (inventory, QC, batch)
 * - Các event handlers xử lý events và cập nhật trạng thái hệ thống
 * - InventoryEventHandler: Xử lý events liên quan đến tồn kho
 * - QcEventHandler: Xử lý events liên quan đến kiểm tra chất lượng
 * - BatchEventHandler: Xử lý events liên quan đến lô sản xuất
 *
 * Lưu ý: Hiện tại KafkaService dùng in-memory array (chưa kết nối Kafka thực)
 * Có thể nâng cấp sau để kết nối Kafka cluster thực tế
 */
import { Module } from '@nestjs/common';
import { KafkaService } from './kafka.service';
import { InventoryEventHandler } from './handlers/inventory-event.handler';
import { QcEventHandler } from './handlers/qc-event.handler';
import { BatchEventHandler } from './handlers/batch-event.handler';

@Module({
	providers: [
		KafkaService,
		InventoryEventHandler,
		QcEventHandler,
		BatchEventHandler,
	],
	exports: [
		KafkaService,
		InventoryEventHandler,
		QcEventHandler,
		BatchEventHandler,
	],
})
export class KafkaModule {}
