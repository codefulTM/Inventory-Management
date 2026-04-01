import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  describe('InventoryTransaction API', () => {
    let createdId: string;

    it('POST /transactions should create a transaction', async () => {
      const dto = {
        lot_id: 'lot-test',
        transaction_type: 'Receipt',
        quantity: 10,
        unit_of_measure: 'pcs',
        performed_by: 'tester',
      };
      const res = await request(app.getHttpServer())
        .post('/transactions')
        .send(dto)
        .expect(201);
      expect(res.body).toHaveProperty('_id');
      createdId = res.body._id;
    });

    it('GET /transactions should list transactions', async () => {
      const res = await request(app.getHttpServer())
        .get('/transactions')
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('GET /transactions/:id should return detail', async () => {
      const res = await request(app.getHttpServer())
        .get(`/transactions/${createdId}`)
        .expect(200);
      expect(res.body).toHaveProperty('_id', createdId);
    });

    it('PATCH /transactions/:id should update metadata', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/transactions/${createdId}`)
        .send({ notes: 'updated' })
        .expect(200);
      expect(res.body).toHaveProperty('notes', 'updated');
    });

    it('POST /transactions/bulk should create multiple', async () => {
      const items = [
        {
          lot_id: 'bulk1',
          transaction_type: 'Receipt',
          quantity: 1,
          unit_of_measure: 'pcs',
          performed_by: 'tester',
        },
        {
          lot_id: 'bulk2',
          transaction_type: 'Usage',
          quantity: -2,
          unit_of_measure: 'pcs',
          performed_by: 'tester',
        },
      ];
      const res = await request(app.getHttpServer())
        .post('/transactions/bulk')
        .send(items)
        .expect(201);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
    });

    it('DELETE /transactions/:id should remove the transaction', async () => {
      await request(app.getHttpServer())
        .delete(`/transactions/${createdId}`)
        .expect(200);
      // subsequent get should 404 or null
      await request(app.getHttpServer())
        .get(`/transactions/${createdId}`)
        .expect(404);
    });
  });
});
