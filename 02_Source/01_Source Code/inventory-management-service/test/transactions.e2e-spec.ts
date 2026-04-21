import { BadRequestException, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { RolesGuard } from '../src/common/auth/roles.guard';
import { JwtAuthGuard } from '../src/common/auth/jwt-auth.guard';
import { InventoryTransactionController } from '../src/inventory-transaction/inventory-transaction.controller';
import { InventoryTransactionRepository } from '../src/inventory-transaction/inventory-transaction.repository';
import { InventoryTransactionService } from '../src/inventory-transaction/inventory-transaction.service';
import { RedisIdService } from '../src/redis-id/redis-id.service';
import { TransactionType } from '../src/inventory-transaction/dto/create-inventory-transaction.dto';

describe('InventoryTransactionController (e2e)', () => {
  let app: INestApplication;
  let service: InventoryTransactionService;
  let repo: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    createMany: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
    deleteByLotId: jest.Mock;
  };

  const rolesGuardMock = {
    canActivate: jest.fn(() => true),
  };

  const jwtGuardMock = {
    canActivate: jest.fn(() => true),
  };

  beforeEach(async () => {
    repo = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      deleteByLotId: jest.fn(),
    };

    const moduleBuilder = Test.createTestingModule({
      controllers: [InventoryTransactionController],
      providers: [
        { provide: InventoryTransactionRepository, useValue: repo },
        InventoryTransactionService,
        {
          provide: RedisIdService,
          useValue: {
            nextId: jest.fn().mockImplementation((prefix: string) =>
              Promise.resolve(`${prefix}-1`),
            ),
          },
        },
      ],
    });

    moduleBuilder.overrideGuard(JwtAuthGuard).useValue(jwtGuardMock);
    moduleBuilder.overrideGuard(RolesGuard).useValue(rolesGuardMock);

    const moduleFixture: TestingModule = await moduleBuilder.compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    service = moduleFixture.get(InventoryTransactionService);
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /transactions forwards parsed filters and pagination to the service', async () => {
    repo.findAll.mockResolvedValue({
      items: [
        {
          _id: 'mongo-1',
          transaction_id: 'txn-1',
          lot_id: 'lot-1',
          transaction_type: TransactionType.Receipt,
          quantity: 10,
          unit_of_measure: 'pcs',
          transaction_date: '2026-04-01T00:00:00.000Z',
          performed_by: 'user-1',
        },
      ],
      total: 1,
    });

    const from = '2026-04-01T00:00:00.000Z';
    const to = '2026-04-30T23:59:59.000Z';

    const response = await request(app.getHttpServer())
      .get('/transactions')
      .query({
        lot_id: 'lot-1',
        transaction_type: TransactionType.Receipt,
        search: 'user-1',
        from,
        to,
        page: '2',
        limit: '25',
      })
      .expect(200);

    expect(response.body).toEqual({
      items: [
        {
          _id: 'mongo-1',
          transaction_id: 'txn-1',
          lot_id: 'lot-1',
          transaction_type: TransactionType.Receipt,
          quantity: 10,
          unit_of_measure: 'pcs',
          transaction_date: '2026-04-01T00:00:00.000Z',
          performed_by: 'user-1',
        },
      ],
      total: 1,
    });

    expect(repo.findAll).toHaveBeenCalledTimes(1);
    const [filters, paging] = repo.findAll.mock.calls[0];
    expect(filters.lot_id).toBe('lot-1');
    expect(filters.transaction_type).toBe(TransactionType.Receipt);
    expect(filters.search).toBe('user-1');
    expect(filters.from).toBeInstanceOf(Date);
    expect(filters.from.toISOString()).toBe(from);
    expect(filters.to).toBeInstanceOf(Date);
    expect(filters.to.toISOString()).toBe(to);
    expect(paging).toEqual({ page: 2, limit: 25 });
  });

  it('POST /transactions creates a receipt transaction with an auto-generated id', async () => {
    repo.create.mockImplementation(async (dto) => ({
      _id: 'mongo-2',
      ...dto,
    }));

    const payload = {
      lot_id: '11111111-1111-4111-8111-111111111111',
      transaction_type: TransactionType.Receipt,
      quantity: 10,
      unit_of_measure: 'pcs',
      performed_by: '22222222-2222-4222-8222-222222222222',
    };

    const response = await request(app.getHttpServer())
      .post('/transactions')
      .send(payload)
      .expect(201);

    expect(response.body).toMatchObject({
      _id: 'mongo-2',
      lot_id: payload.lot_id,
      transaction_type: TransactionType.Receipt,
      quantity: 10,
      unit_of_measure: 'pcs',
      performed_by: payload.performed_by,
    });
    expect(response.body.transaction_id).toBeDefined();
    expect(response.body.transaction_date).toBeDefined();
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        transaction_date: expect.any(String),
        lot_id: payload.lot_id,
        quantity: payload.quantity,
        performed_by: payload.performed_by,
      }),
    );
  });

  it('POST /transactions rejects an invalid receipt quantity', async () => {
    repo.create.mockRejectedValue(
      new BadRequestException('receipt quantity must be positive'),
    );

    const response = await request(app.getHttpServer())
      .post('/transactions')
      .send({
        lot_id: '11111111-1111-4111-8111-111111111111',
        transaction_type: TransactionType.Receipt,
        quantity: 0,
        unit_of_measure: 'pcs',
        performed_by: '22222222-2222-4222-8222-222222222222',
      })
      .expect(400);

    expect(response.body.message).toContain('receipt quantity must be positive');
    expect(repo.create).toHaveBeenCalledTimes(0);
  });

  it('POST /transactions/bulk delegates each record to createMany', async () => {
    repo.create.mockImplementation(async (dto) => ({
      _id:
        dto.quantity === 5
          ? 'mongo-3'
          : 'mongo-4',
      ...dto,
    }));

    const payload = [
      {
        lot_id: '11111111-1111-4111-8111-111111111111',
        transaction_type: TransactionType.Receipt,
        quantity: 5,
        unit_of_measure: 'pcs',
        performed_by: '22222222-2222-4222-8222-222222222222',
      },
      {
        lot_id: '11111111-1111-4111-8111-111111111111',
        transaction_type: TransactionType.Usage,
        quantity: -2,
        unit_of_measure: 'pcs',
        performed_by: '22222222-2222-4222-8222-222222222222',
      },
    ];

    const response = await request(app.getHttpServer())
      .post('/transactions/bulk')
      .send(payload)
      .expect(201);

    expect(response.body).toMatchObject([
      {
        _id: 'mongo-3',
        transaction_date: expect.any(String),
      },
      {
        _id: 'mongo-4',
        transaction_date: expect.any(String),
      },
    ]);
    expect(repo.create).toHaveBeenCalledTimes(2);
  });
});