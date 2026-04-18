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
