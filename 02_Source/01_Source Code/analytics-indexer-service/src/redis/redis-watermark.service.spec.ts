import { Test, TestingModule } from '@nestjs/testing';
import { RedisWatermarkService } from './redis-watermark.service';
import { REDIS_CLIENT } from './redis.constants';

describe('RedisWatermarkService', () => {
  let service: RedisWatermarkService;
  const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisWatermarkService,
        { provide: REDIS_CLIENT, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<RedisWatermarkService>(RedisWatermarkService);
    jest.clearAllMocks();
  });

  describe('getWatermark', () => {
    it('returns null when key does not exist', async () => {
      mockRedis.get.mockResolvedValue(null);
      const result = await service.getWatermark('inventory_lots');
      expect(result).toBeNull();
      expect(mockRedis.get).toHaveBeenCalledWith('analytics:watermark:inventory_lots');
    });

    it('returns a Date when valid ISO string is stored', async () => {
      const iso = '2026-04-01T00:00:00.000Z';
      mockRedis.get.mockResolvedValue(iso);
      const result = await service.getWatermark('inventory_lots');
      expect(result).toEqual(new Date(iso));
    });

    it('returns null and logs warning when stored value is not a valid date', async () => {
      mockRedis.get.mockResolvedValue('not-a-date');
      const result = await service.getWatermark('inventory_lots');
      expect(result).toBeNull();
    });
  });

  describe('setWatermark', () => {
    it('stores the ISO string for the given collection', async () => {
      mockRedis.set.mockResolvedValue('OK');
      const ts = new Date('2026-04-15T12:00:00.000Z');
      await service.setWatermark('qc_tests', ts);
      expect(mockRedis.set).toHaveBeenCalledWith(
        'analytics:watermark:qc_tests',
        ts.toISOString(),
      );
    });
  });
});
