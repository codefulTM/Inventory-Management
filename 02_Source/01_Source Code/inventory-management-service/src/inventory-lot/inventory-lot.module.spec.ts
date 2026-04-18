import 'reflect-metadata';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { InventoryLotController } from './inventory-lot.controller';
import { InventoryLotModule } from './inventory-lot.module';
import { InventoryTransactionModule } from '../inventory-transaction/inventory-transaction.module';
import { InventoryLotRepository } from './inventory-lot.repository';
import { InventoryLotService } from './inventory-lot.service';
import { InventoryLot } from '../schemas/inventory-lot.schema';

jest.mock(
  'src/inventory-lot/inventory-lot.dto',
  () => ({
    InventoryLotStatus: {
      QUARANTINE: 'Quarantine',
      ACCEPTED: 'Accepted',
      REJECTED: 'Rejected',
      DEPLETED: 'Depleted',
    },
  }),
  { virtual: true },
);

type DynamicModuleLike = {
  module?: unknown;
  providers?: unknown[];
};

function getProviderTokens(providers: unknown[] = []): unknown[] {
  return providers.map((provider) => {
    if (
      typeof provider === 'object' &&
      provider !== null &&
      'provide' in provider
    ) {
      return (provider as { provide: unknown }).provide;
    }

    return provider;
  });
}

describe('InventoryLotModule', () => {
  const imports = Reflect.getMetadata(
    MODULE_METADATA.IMPORTS,
    InventoryLotModule,
  ) as DynamicModuleLike[];
  const controllers = Reflect.getMetadata(
    MODULE_METADATA.CONTROLLERS,
    InventoryLotModule,
  ) as unknown[];
  const providers = Reflect.getMetadata(
    MODULE_METADATA.PROVIDERS,
    InventoryLotModule,
  ) as unknown[];
  const exportedProviders = Reflect.getMetadata(
    MODULE_METADATA.EXPORTS,
    InventoryLotModule,
  ) as unknown[];

  it('should define module class', () => {
    expect(InventoryLotModule).toBeDefined();
  });

  it('should register InventoryLotController', () => {
    expect(controllers).toEqual([InventoryLotController]);
  });

  it('should register InventoryLotService and InventoryLotRepository providers', () => {
    expect(providers).toEqual(
      expect.arrayContaining([InventoryLotService, InventoryLotRepository]),
    );
  });

  it('should export service and repository', () => {
    expect(exportedProviders).toEqual(
      expect.arrayContaining([InventoryLotService, InventoryLotRepository]),
    );
  });

  it('should register mongoose feature import for InventoryLot schema', () => {
    expect(imports).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          module: MongooseModule,
        }),
        InventoryTransactionModule,
      ]),
    );

    const mongooseImport = imports.find(
      (imp) => (imp as any)?.module === MongooseModule,
    );
    const providerTokens = getProviderTokens(mongooseImport?.providers);
    expect(providerTokens).toContain(getModelToken(InventoryLot.name));
  });
});
