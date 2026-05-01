export type KafkaRuntimeConfig = {
	brokers: string[];
	clientId: string;
	enabled: boolean;
};

export const defaultKafkaConfig: KafkaRuntimeConfig = {
	brokers: ['localhost:9092'],
	clientId: 'inventory-management-backend',
	enabled: false,
};
