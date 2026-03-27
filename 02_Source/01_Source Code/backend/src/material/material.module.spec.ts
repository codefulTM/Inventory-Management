import 'reflect-metadata';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { MaterialController } from './material.controller';
import { MaterialModule } from './material.module';
import { MaterialRepository } from './material.repository';
import { MaterialService } from './material.service';
import { Material } from '../schemas/material.schema';

type DynamicModuleLike = {
  module?: unknown;
  providers?: unknown[];
  exports?: unknown[];
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

describe('MaterialModule', () => {
  const imports = Reflect.getMetadata(
    MODULE_METADATA.IMPORTS,
    MaterialModule,
  ) as DynamicModuleLike[];
  const controllers = Reflect.getMetadata(
    MODULE_METADATA.CONTROLLERS,
    MaterialModule,
  ) as unknown[];
  const providers = Reflect.getMetadata(
    MODULE_METADATA.PROVIDERS,
    MaterialModule,
  ) as unknown[];
  const exportedProviders = Reflect.getMetadata(
    MODULE_METADATA.EXPORTS,
    MaterialModule,
  ) as unknown[];

  it('should define the module class', () => {
    expect(MaterialModule).toBeDefined();
  });

  it('should register MaterialController', () => {
    expect(controllers).toEqual([MaterialController]);
  });

  it('should register repository and service providers', () => {
    expect(providers).toEqual(
      expect.arrayContaining([MaterialRepository, MaterialService]),
    );
  });

  it('should export MaterialService only', () => {
    expect(exportedProviders).toEqual([MaterialService]);
    expect(exportedProviders).not.toContain(MaterialRepository);
  });

  it('should register mongoose feature import', () => {
    expect(imports).toHaveLength(1);
    expect(imports[0]).toEqual(
      expect.objectContaining({
        module: MongooseModule,
      }),
    );
  });

  it('should include material model token in mongoose providers', () => {
    const dynamicImport = imports[0];
    const providerTokens = getProviderTokens(dynamicImport?.providers);

    expect(providerTokens).toContain(getModelToken(Material.name));
  });
});
