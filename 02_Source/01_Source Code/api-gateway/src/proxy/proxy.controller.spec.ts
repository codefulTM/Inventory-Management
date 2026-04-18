import { Test, TestingModule } from '@nestjs/testing';
import { ProxyController } from './proxy.controller';
import { ConfigService } from '@nestjs/config';

describe('ProxyController', () => {
  let controller: ProxyController;

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string, def: string) => {
      if (key === 'BACKEND_HTTP_URL') return 'http://backend:3001';
      return def;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProxyController],
      providers: [{ provide: ConfigService, useValue: mockConfigService }],
    }).compile();

    controller = module.get<ProxyController>(ProxyController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
