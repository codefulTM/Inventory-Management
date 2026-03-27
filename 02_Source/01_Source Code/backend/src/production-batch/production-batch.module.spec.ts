import 'reflect-metadata';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { ProductionBatchController } from './production-batch.controller';
import { ProductionBatchModule } from './production-batch.module';
import { ProductionBatchRepository } from './production-batch.repository';
import { BatchComponentRepository } from './batch-component.repository';
import { ProductionBatchService } from './production-batch.service';
import { BatchComponentService } from './batch-component.service';
import { ProductionBatch } from '../schemas/production-batch.schema';
import { BatchComponent } from '../schemas/batch-component.schema';
import { Material } from '../schemas/material.schema';
import { InventoryLot } from '../schemas/inventory-lot.schema';

jest.mock('uuid', () => ({
  v4: () => '00000000-0000-4000-8000-000000000001',
}));

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

describe('ProductionBatchModule', () => {
  const imports = Reflect.getMetadata(
    MODULE_METADATA.IMPORTS,
    ProductionBatchModule,
  ) as DynamicModuleLike[];
  const controllers = Reflect.getMetadata(
    MODULE_METADATA.CONTROLLERS,
    ProductionBatchModule,
  ) as unknown[];
  const providers = Reflect.getMetadata(
    MODULE_METADATA.PROVIDERS,
    ProductionBatchModule,
  ) as unknown[];
  const exportedProviders = Reflect.getMetadata(
    MODULE_METADATA.EXPORTS,
    ProductionBatchModule,
  ) as unknown[];

  it('should define module class', () => {
    expect(ProductionBatchModule).toBeDefined();
  });

  it('should register controller', () => {
    expect(controllers).toEqual([ProductionBatchController]);
  });

  it('should register repositories and services', () => {
    expect(providers).toEqual(
      expect.arrayContaining([
        ProductionBatchRepository,
        BatchComponentRepository,
        ProductionBatchService,
        BatchComponentService,
      ]),
    );
  });

  it('should export services only', () => {
    expect(exportedProviders).toEqual(
      expect.arrayContaining([ProductionBatchService, BatchComponentService]),
    );
    expect(exportedProviders).not.toContain(ProductionBatchRepository);
    expect(exportedProviders).not.toContain(BatchComponentRepository);
  });

  it('should include mongoose feature import', () => {
    expect(imports).toHaveLength(1);
    expect(imports[0]).toEqual(
      expect.objectContaining({
        module: MongooseModule,
      }),
    );
  });

  it('should register all expected model tokens in mongoose providers', () => {
    const providerTokens = getProviderTokens(imports[0]?.providers);

    expect(providerTokens).toEqual(
      expect.arrayContaining([
        getModelToken(ProductionBatch.name),
        getModelToken(BatchComponent.name),
        getModelToken(Material.name),
        getModelToken(InventoryLot.name),
      ]),
    );
  });
});
