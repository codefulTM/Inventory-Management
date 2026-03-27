import 'reflect-metadata';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { LabelTemplateController } from './label-template.controller';
import { LabelTemplateModule } from './label-template.module';
import { LabelTemplateRepository } from './label-template.repository';
import { LabelTemplateService } from './label-template.service';
import { LabelTemplate } from '../schemas/label-template.schema';

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

describe('LabelTemplateModule', () => {
  const imports = Reflect.getMetadata(
    MODULE_METADATA.IMPORTS,
    LabelTemplateModule,
  ) as DynamicModuleLike[];
  const controllers = Reflect.getMetadata(
    MODULE_METADATA.CONTROLLERS,
    LabelTemplateModule,
  ) as unknown[];
  const providers = Reflect.getMetadata(
    MODULE_METADATA.PROVIDERS,
    LabelTemplateModule,
  ) as unknown[];
  const exportedProviders = Reflect.getMetadata(
    MODULE_METADATA.EXPORTS,
    LabelTemplateModule,
  ) as unknown[];

  it('should define the module class', () => {
    expect(LabelTemplateModule).toBeDefined();
  });

  it('should register the label template controller', () => {
    expect(controllers).toEqual([LabelTemplateController]);
  });

  it('should register repository and service providers', () => {
    expect(providers).toEqual(
      expect.arrayContaining([LabelTemplateRepository, LabelTemplateService]),
    );
  });

  it('should export the label template service', () => {
    expect(exportedProviders).toEqual([LabelTemplateService]);
  });

  it('should not export the repository directly', () => {
    expect(exportedProviders).not.toContain(LabelTemplateRepository);
  });

  it('should register a mongoose feature import', () => {
    expect(imports).toHaveLength(1);
    expect(imports[0]).toEqual(
      expect.objectContaining({
        module: MongooseModule,
      }),
    );
  });

  it('should include the label template model token in mongoose providers', () => {
    const dynamicImport = imports[0];
    const providerTokens = getProviderTokens(dynamicImport.providers);

    expect(providerTokens).toContain(getModelToken(LabelTemplate.name));
  });
});
