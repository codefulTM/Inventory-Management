import { Kafka } from 'kafkajs';
import { execSync } from 'child_process';

const kafkaHost = 'localhost:9092';
const topic = 'test-topic-' + Date.now();

describe('Kafka e2e', () => {
  let kafka: Kafka;
  let messages: any[] = [];

  beforeAll(async () => {
    // start broker via npm script (relative to backend folder)
    execSync('npm run kafka:up', { cwd: __dirname + '/../' });
    kafka = new Kafka({ brokers: [kafkaHost] });
  }, 120000);

  afterAll(async () => {
    // shut down kafka
    execSync('npm run kafka:down', { cwd: __dirname + '/../' });
  });

  it('can produce and consume a message', async () => {
    const admin = kafka.admin();
    await admin.connect();
    await admin.createTopics({ topics: [{ topic, numPartitions: 1 }] });
    await admin.disconnect();

    const producer = kafka.producer();
    await producer.connect();
    await producer.send({ topic, messages: [{ value: 'hello' }] });
    await producer.disconnect();

    const consumer = kafka.consumer({ groupId: 'e2e-group-' + Date.now() });
    await consumer.connect();
    await consumer.subscribe({ topic, fromBeginning: true });
    const p = new Promise<void>((resolve) => {
      consumer.run({
        eachMessage: async ({ message }) => {
          messages.push(message.value?.toString());
          resolve();
        },
      });
    });
    await p;
    await consumer.disconnect();

    expect(messages).toContain('hello');
  }, 60000);
});
