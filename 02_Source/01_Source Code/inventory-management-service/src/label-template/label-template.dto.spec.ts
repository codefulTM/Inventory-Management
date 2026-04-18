import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  CreateLabelTemplateDto,
  UpdateLabelTemplateDto,
  GenerateLabelDto,
  LabelTypeValues,
} from './label-template.dto';

describe('LabelTemplate DTOs Validation', () => {
  describe('CreateLabelTemplateDto', () => {
    describe('template_id validation', () => {
      it('should accept valid template_id', async () => {
        const dto = plainToInstance(CreateLabelTemplateDto, {
          template_id: 'RAW-001',
          template_name: 'Raw Material',
          label_type: 'Raw Material',
          template_content: 'Content',
          width: 4.5,
          height: 6.0,
        });

        const errors = await validate(dto);

        expect(errors).toHaveLength(0);
      });

      it('should reject empty template_id', async () => {
        const dto = plainToInstance(CreateLabelTemplateDto, {
          template_id: '',
          template_name: 'Raw Material',
          label_type: 'Raw Material',
          template_content: 'Content',
          width: 4.5,
          height: 6.0,
        });

        const errors = await validate(dto);

        expect(errors.length).toBeGreaterThan(0);
      });

      it('should reject missing template_id', async () => {
        const dto = plainToInstance(CreateLabelTemplateDto, {
          template_name: 'Raw Material',
          label_type: 'Raw Material',
          template_content: 'Content',
          width: 4.5,
          height: 6.0,
        });

        const errors = await validate(dto);

        expect(errors.length).toBeGreaterThan(0);
      });

      it('should reject template_id exceeding 20 characters', async () => {
        const dto = plainToInstance(CreateLabelTemplateDto, {
          template_id: 'RAW-00000000000000001',
          template_name: 'Raw Material',
          label_type: 'Raw Material',
          template_content: 'Content',
          width: 4.5,
          height: 6.0,
        });

        const errors = await validate(dto);

        expect(errors.length).toBeGreaterThan(0);
      });

      it('should accept template_id at maximum length (20 chars)', async () => {
        const dto = plainToInstance(CreateLabelTemplateDto, {
          template_id: '12345678901234567890', // 20 chars
          template_name: 'Raw Material',
          label_type: 'Raw Material',
          template_content: 'Content',
          width: 4.5,
          height: 6.0,
        });

        const errors = await validate(dto);

        expect(errors).toHaveLength(0);
      });
    });

    describe('template_name validation', () => {
      it('should accept valid template_name', async () => {
        const dto = plainToInstance(CreateLabelTemplateDto, {
          template_id: 'RAW-001',
          template_name: 'Raw Material Label',
          label_type: 'Raw Material',
          template_content: 'Content',
          width: 4.5,
          height: 6.0,
        });

        const errors = await validate(dto);

        expect(errors).toHaveLength(0);
      });

      it('should reject empty template_name', async () => {
        const dto = plainToInstance(CreateLabelTemplateDto, {
          template_id: 'RAW-001',
          template_name: '',
          label_type: 'Raw Material',
          template_content: 'Content',
          width: 4.5,
          height: 6.0,
        });

        const errors = await validate(dto);

        expect(errors.length).toBeGreaterThan(0);
      });

      it('should reject missing template_name', async () => {
        const dto = plainToInstance(CreateLabelTemplateDto, {
          template_id: 'RAW-001',
          label_type: 'Raw Material',
          template_content: 'Content',
          width: 4.5,
          height: 6.0,
        });

        const errors = await validate(dto);

        expect(errors.length).toBeGreaterThan(0);
      });

      it('should reject template_name exceeding 100 characters', async () => {
        const dto = plainToInstance(CreateLabelTemplateDto, {
          template_id: 'RAW-001',
          template_name: 'A'.repeat(101),
          label_type: 'Raw Material',
          template_content: 'Content',
          width: 4.5,
          height: 6.0,
        });

        const errors = await validate(dto);

        expect(errors.length).toBeGreaterThan(0);
      });

      it('should accept template_name at maximum length (100 chars)', async () => {
        const dto = plainToInstance(CreateLabelTemplateDto, {
          template_id: 'RAW-001',
          template_name: 'A'.repeat(100),
          label_type: 'Raw Material',
          template_content: 'Content',
          width: 4.5,
          height: 6.0,
        });

        const errors = await validate(dto);

        expect(errors).toHaveLength(0);
      });
    });

    describe('label_type validation', () => {
      it('should accept all valid label_type values', async () => {
        for (const type of LabelTypeValues) {
          const dto = plainToInstance(CreateLabelTemplateDto, {
            template_id: 'RAW-001',
            template_name: 'Label',
            label_type: type,
            template_content: 'Content',
            width: 4.5,
            height: 6.0,
          });

          const errors = await validate(dto);

          expect(errors).toHaveLength(0);
        }
      });

      it('should accept Raw Material label_type', async () => {
        const dto = plainToInstance(CreateLabelTemplateDto, {
          template_id: 'RAW-001',
          template_name: 'Label',
          label_type: 'Raw Material',
          template_content: 'Content',
          width: 4.5,
          height: 6.0,
        });

        const errors = await validate(dto);

        expect(errors).toHaveLength(0);
      });

      it('should reject invalid label_type', async () => {
        const dto = plainToInstance(CreateLabelTemplateDto, {
          template_id: 'RAW-001',
          template_name: 'Label',
          label_type: 'Invalid Type',
          template_content: 'Content',
          width: 4.5,
          height: 6.0,
        });

        const errors = await validate(dto);

        expect(errors.length).toBeGreaterThan(0);
      });

      it('should reject missing label_type', async () => {
        const dto = plainToInstance(CreateLabelTemplateDto, {
          template_id: 'RAW-001',
          template_name: 'Label',
          template_content: 'Content',
          width: 4.5,
          height: 6.0,
        });

        const errors = await validate(dto);

        expect(errors.length).toBeGreaterThan(0);
      });

      it('should reject empty string label_type', async () => {
        const dto = plainToInstance(CreateLabelTemplateDto, {
          template_id: 'RAW-001',
          template_name: 'Label',
          label_type: '',
          template_content: 'Content',
          width: 4.5,
          height: 6.0,
        });

        const errors = await validate(dto);

        expect(errors.length).toBeGreaterThan(0);
      });
    });

    describe('template_content validation', () => {
      it('should accept valid template_content', async () => {
        const dto = plainToInstance(CreateLabelTemplateDto, {
          template_id: 'RAW-001',
          template_name: 'Label',
          label_type: 'Raw Material',
          template_content:
            'Material: {{material_name}}\nExpires: {{expiration_date}}',
          width: 4.5,
          height: 6.0,
        });

        const errors = await validate(dto);

        expect(errors).toHaveLength(0);
      });

      it('should reject empty template_content', async () => {
        const dto = plainToInstance(CreateLabelTemplateDto, {
          template_id: 'RAW-001',
          template_name: 'Label',
          label_type: 'Raw Material',
          template_content: '',
          width: 4.5,
          height: 6.0,
        });

        const errors = await validate(dto);

        expect(errors.length).toBeGreaterThan(0);
      });

      it('should reject missing template_content', async () => {
        const dto = plainToInstance(CreateLabelTemplateDto, {
          template_id: 'RAW-001',
          template_name: 'Label',
          label_type: 'Raw Material',
          width: 4.5,
          height: 6.0,
        });

        const errors = await validate(dto);

        expect(errors.length).toBeGreaterThan(0);
      });

      it('should accept long template_content', async () => {
        const dto = plainToInstance(CreateLabelTemplateDto, {
          template_id: 'RAW-001',
          template_name: 'Label',
          label_type: 'Raw Material',
          template_content: 'A'.repeat(1000),
          width: 4.5,
          height: 6.0,
        });

        const errors = await validate(dto);

        expect(errors).toHaveLength(0);
      });
    });

    describe('width validation', () => {
      it('should accept valid width', async () => {
        const dto = plainToInstance(CreateLabelTemplateDto, {
          template_id: 'RAW-001',
          template_name: 'Label',
          label_type: 'Raw Material',
          template_content: 'Content',
          width: 4.5,
          height: 6.0,
        });

        const errors = await validate(dto);

        expect(errors).toHaveLength(0);
      });

      it('should accept width at minimum value (0.01)', async () => {
        const dto = plainToInstance(CreateLabelTemplateDto, {
          template_id: 'RAW-001',
          template_name: 'Label',
          label_type: 'Raw Material',
          template_content: 'Content',
          width: 0.01,
          height: 6.0,
        });

        const errors = await validate(dto);

        expect(errors).toHaveLength(0);
      });

      it('should accept width at maximum value (99.99)', async () => {
        const dto = plainToInstance(CreateLabelTemplateDto, {
          template_id: 'RAW-001',
          template_name: 'Label',
          label_type: 'Raw Material',
          template_content: 'Content',
          width: 99.99,
          height: 6.0,
        });

        const errors = await validate(dto);

        expect(errors).toHaveLength(0);
      });

      it('should reject width below minimum (< 0.01)', async () => {
        const dto = plainToInstance(CreateLabelTemplateDto, {
          template_id: 'RAW-001',
          template_name: 'Label',
          label_type: 'Raw Material',
          template_content: 'Content',
          width: 0.009,
          height: 6.0,
        });

        const errors = await validate(dto);

        expect(errors.length).toBeGreaterThan(0);
      });

      it('should reject width above maximum (> 99.99)', async () => {
        const dto = plainToInstance(CreateLabelTemplateDto, {
          template_id: 'RAW-001',
          template_name: 'Label',
          label_type: 'Raw Material',
          template_content: 'Content',
          width: 100.0,
          height: 6.0,
        });

        const errors = await validate(dto);

        expect(errors.length).toBeGreaterThan(0);
      });

      it('should reject zero width', async () => {
        const dto = plainToInstance(CreateLabelTemplateDto, {
          template_id: 'RAW-001',
          template_name: 'Label',
          label_type: 'Raw Material',
          template_content: 'Content',
          width: 0,
          height: 6.0,
        });

        const errors = await validate(dto);

        expect(errors.length).toBeGreaterThan(0);
      });

      it('should reject negative width', async () => {
        const dto = plainToInstance(CreateLabelTemplateDto, {
          template_id: 'RAW-001',
          template_name: 'Label',
          label_type: 'Raw Material',
          template_content: 'Content',
          width: -5.0,
          height: 6.0,
        });

        const errors = await validate(dto);

        expect(errors.length).toBeGreaterThan(0);
      });

      it('should reject missing width', async () => {
        const dto = plainToInstance(CreateLabelTemplateDto, {
          template_id: 'RAW-001',
          template_name: 'Label',
          label_type: 'Raw Material',
          template_content: 'Content',
          height: 6.0,
        });

        const errors = await validate(dto);

        expect(errors.length).toBeGreaterThan(0);
      });
    });

    describe('height validation', () => {
      it('should accept valid height', async () => {
        const dto = plainToInstance(CreateLabelTemplateDto, {
          template_id: 'RAW-001',
          template_name: 'Label',
          label_type: 'Raw Material',
          template_content: 'Content',
          width: 4.5,
          height: 6.0,
        });

        const errors = await validate(dto);

        expect(errors).toHaveLength(0);
      });

      it('should accept height at minimum value (0.01)', async () => {
        const dto = plainToInstance(CreateLabelTemplateDto, {
          template_id: 'RAW-001',
          template_name: 'Label',
          label_type: 'Raw Material',
          template_content: 'Content',
          width: 4.5,
          height: 0.01,
        });

        const errors = await validate(dto);

        expect(errors).toHaveLength(0);
      });

      it('should accept height at maximum value (99.99)', async () => {
        const dto = plainToInstance(CreateLabelTemplateDto, {
          template_id: 'RAW-001',
          template_name: 'Label',
          label_type: 'Raw Material',
          template_content: 'Content',
          width: 4.5,
          height: 99.99,
        });

        const errors = await validate(dto);

        expect(errors).toHaveLength(0);
      });

      it('should reject height below minimum (< 0.01)', async () => {
        const dto = plainToInstance(CreateLabelTemplateDto, {
          template_id: 'RAW-001',
          template_name: 'Label',
          label_type: 'Raw Material',
          template_content: 'Content',
          width: 4.5,
          height: 0.009,
        });

        const errors = await validate(dto);

        expect(errors.length).toBeGreaterThan(0);
      });

      it('should reject height above maximum (> 99.99)', async () => {
        const dto = plainToInstance(CreateLabelTemplateDto, {
          template_id: 'RAW-001',
          template_name: 'Label',
          label_type: 'Raw Material',
          template_content: 'Content',
          width: 4.5,
          height: 100.0,
        });

        const errors = await validate(dto);

        expect(errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('UpdateLabelTemplateDto', () => {
    it('should accept all fields optional', async () => {
      const dto = plainToInstance(UpdateLabelTemplateDto, {});

      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should accept partial update with only template_name', async () => {
      const dto = plainToInstance(UpdateLabelTemplateDto, {
        template_name: 'Updated Name',
      });

      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should accept partial update with only label_type', async () => {
      const dto = plainToInstance(UpdateLabelTemplateDto, {
        label_type: 'API',
      });

      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should accept partial update with only template_content', async () => {
      const dto = plainToInstance(UpdateLabelTemplateDto, {
        template_content: 'Updated content',
      });

      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should accept partial update with only width', async () => {
      const dto = plainToInstance(UpdateLabelTemplateDto, {
        width: 5.0,
      });

      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should accept partial update with only height', async () => {
      const dto = plainToInstance(UpdateLabelTemplateDto, {
        height: 7.0,
      });

      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should validate template_name when provided', async () => {
      const dto = plainToInstance(UpdateLabelTemplateDto, {
        template_name: 'A'.repeat(101),
      });

      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should validate label_type when provided', async () => {
      const dto = plainToInstance(UpdateLabelTemplateDto, {
        label_type: 'Invalid',
      });

      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should validate width constraints when provided', async () => {
      const dto = plainToInstance(UpdateLabelTemplateDto, {
        width: 100.0,
      });

      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should validate height constraints when provided', async () => {
      const dto = plainToInstance(UpdateLabelTemplateDto, {
        height: 0.005,
      });

      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('GenerateLabelDto', () => {
    it('should accept valid template_id only', async () => {
      const dto = plainToInstance(GenerateLabelDto, {
        template_id: 'RAW-001',
      });

      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should accept template_id with lot_id', async () => {
      const dto = plainToInstance(GenerateLabelDto, {
        template_id: 'RAW-001',
        lot_id: 'LOT-001',
      });

      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should accept template_id with batch_id', async () => {
      const dto = plainToInstance(GenerateLabelDto, {
        template_id: 'RAW-001',
        batch_id: 'BATCH-001',
      });

      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should reject missing template_id', async () => {
      const dto = plainToInstance(GenerateLabelDto, {
        lot_id: 'LOT-001',
      });

      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should accept both lot_id and batch_id if provided', async () => {
      const dto = plainToInstance(GenerateLabelDto, {
        template_id: 'RAW-001',
        lot_id: 'LOT-001',
        batch_id: 'BATCH-001',
      });

      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should accept empty lot_id', async () => {
      const dto = plainToInstance(GenerateLabelDto, {
        template_id: 'RAW-001',
        lot_id: undefined,
      });

      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should accept empty batch_id', async () => {
      const dto = plainToInstance(GenerateLabelDto, {
        template_id: 'RAW-001',
        batch_id: undefined,
      });

      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });
  });

  describe('Type transformation', () => {
    it('should transform numeric string width to number', () => {
      const dto = plainToInstance(CreateLabelTemplateDto, {
        template_id: 'RAW-001',
        template_name: 'Label',
        label_type: 'Raw Material',
        template_content: 'Content',
        width: '4.5',
        height: '6.0',
      });

      expect(typeof dto.width).toBe('number');
      expect(typeof dto.height).toBe('number');
    });

    it('should transform numeric string in UpdateLabelTemplateDto', () => {
      const dto = plainToInstance(UpdateLabelTemplateDto, {
        width: '5.0',
        height: '7.0',
      });

      expect(typeof dto.width).toBe('number');
      expect(typeof dto.height).toBe('number');
    });
  });

  describe('All label types', () => {
    it('should validate all 6 label type values', () => {
      const expectedTypes = [
        'Raw Material',
        'Sample',
        'Intermediate',
        'Finished Product',
        'API',
        'Status',
      ];

      expect(LabelTypeValues).toHaveLength(6);
      expect(LabelTypeValues).toEqual(expect.arrayContaining(expectedTypes));
    });
  });

  describe('Large parameterized datasets', () => {
    const baseCreatePayload = {
      template_id: 'RAW-BASE',
      template_name: 'Base Template',
      label_type: 'Raw Material',
      template_content: 'Material: {{material_name}}',
      width: 4.5,
      height: 6.0,
    };

    it.each([
      'A',
      'RAW-001',
      'RAW_001',
      'RAW 001',
      '123',
      'abcXYZ',
      'template-id',
      'TEMPLATE-ID-00000001',
      '12345678901234567890',
      'ID.with.dots',
      'ID/with/slash',
      'ID:with:colon',
      'ID@symbol',
      'unicode-Á',
      '日本語',
      '한국어',
      'مرحبا',
      'Mix3d-Ch4rs_01',
    ])('should accept template_id variant: %s', async (template_id) => {
      const dto = plainToInstance(CreateLabelTemplateDto, {
        ...baseCreatePayload,
        template_id,
      });

      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it.each(['', '123456789012345678901', 123, true, null, undefined, {}, []])(
      'should reject invalid template_id variant: %p',
      async (template_id) => {
        const dto = plainToInstance(CreateLabelTemplateDto, {
          ...baseCreatePayload,
          template_id,
        } as any);

        const errors = await validate(dto);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some((err) => err.property === 'template_id')).toBe(true);
      },
    );

    it.each([
      'N',
      'Label Name',
      'A'.repeat(100),
      'Name with spaces',
      'Name-With-Dashes',
      'Name_With_Underscore',
      'Name.With.Dots',
      'Tên tiếng Việt',
      '日本語ラベル',
      '한국어 라벨',
      'Arabic اسم',
      'Name12345',
      'Long Long Long Label Name 2026',
      'CapsLOCK',
      'lowercase',
      'MiXeD Case',
    ])('should accept template_name variant: %s', async (template_name) => {
      const dto = plainToInstance(CreateLabelTemplateDto, {
        ...baseCreatePayload,
        template_name,
      });

      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it.each(['', 'A'.repeat(101), 999, false, null, undefined, {}, []])(
      'should reject invalid template_name variant: %p',
      async (template_name) => {
        const dto = plainToInstance(CreateLabelTemplateDto, {
          ...baseCreatePayload,
          template_name,
        } as any);

        const errors = await validate(dto);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some((err) => err.property === 'template_name')).toBe(
          true,
        );
      },
    );

    it.each(LabelTypeValues)(
      'should accept label_type from enum dataset: %s',
      async (label_type) => {
        const dto = plainToInstance(CreateLabelTemplateDto, {
          ...baseCreatePayload,
          label_type,
        });

        const errors = await validate(dto);

        expect(errors).toHaveLength(0);
      },
    );

    it.each([
      'raw material',
      'RAW MATERIAL',
      'RawMaterial',
      'status',
      'INVALID',
      '',
      'API ',
      ' Sample',
      123,
      null,
      undefined,
      {},
      [],
    ])('should reject invalid label_type variant: %p', async (label_type) => {
      const dto = plainToInstance(CreateLabelTemplateDto, {
        ...baseCreatePayload,
        label_type,
      } as any);

      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((err) => err.property === 'label_type')).toBe(true);
    });

    it.each([
      { width: 0.01, height: 0.01 },
      { width: 0.1, height: 0.1 },
      { width: 1, height: 1 },
      { width: 2.5, height: 3.5 },
      { width: 4.5, height: 6.0 },
      { width: 10, height: 20 },
      { width: 50.5, height: 25.25 },
      { width: 99.99, height: 99.99 },
      { width: '4.5', height: '6.0' },
      { width: '0.01', height: '0.01' },
      { width: '99.99', height: '99.99' },
      { width: '12', height: '34' },
      { width: '7.777', height: '8.888' },
      { width: 33.333, height: 44.444 },
      { width: 88.8, height: 11.1 },
    ])(
      'should accept numeric width/height payload: %p',
      async ({ width, height }) => {
        const dto = plainToInstance(CreateLabelTemplateDto, {
          ...baseCreatePayload,
          width,
          height,
        } as any);

        const errors = await validate(dto);

        expect(errors).toHaveLength(0);
        expect(typeof dto.width).toBe('number');
        expect(typeof dto.height).toBe('number');
        expect(dto.width).toBeGreaterThanOrEqual(0.01);
        expect(dto.height).toBeGreaterThanOrEqual(0.01);
      },
    );

    it.each([
      { width: 0, height: 1, invalidProp: 'width' },
      { width: -1, height: 1, invalidProp: 'width' },
      { width: 0.009, height: 1, invalidProp: 'width' },
      { width: 100, height: 1, invalidProp: 'width' },
      { width: 100.01, height: 1, invalidProp: 'width' },
      { width: 'abc', height: 1, invalidProp: 'width' },
      { width: null, height: 1, invalidProp: 'width' },
      { width: undefined, height: 1, invalidProp: 'width' },
      { width: 1, height: 0, invalidProp: 'height' },
      { width: 1, height: -1, invalidProp: 'height' },
      { width: 1, height: 0.005, invalidProp: 'height' },
      { width: 1, height: 100, invalidProp: 'height' },
      { width: 1, height: 100.01, invalidProp: 'height' },
      { width: 1, height: 'abc', invalidProp: 'height' },
      { width: 1, height: null, invalidProp: 'height' },
      { width: 1, height: undefined, invalidProp: 'height' },
    ])(
      'should reject invalid width/height payload: %p',
      async ({ width, height, invalidProp }) => {
        const dto = plainToInstance(CreateLabelTemplateDto, {
          ...baseCreatePayload,
          width,
          height,
        } as any);

        const errors = await validate(dto);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some((err) => err.property === invalidProp)).toBe(true);
      },
    );

    it.each([
      { template_name: 'Name only' },
      { label_type: 'Raw Material' },
      { label_type: 'API' },
      { template_content: 'Only content' },
      { width: 0.01 },
      { width: 99.99 },
      { height: 0.01 },
      { height: 99.99 },
      { template_name: 'Combined', width: 9.5 },
      { template_name: 'Combined', height: 8.5 },
      { label_type: 'Sample', template_content: 'Sample template' },
      { width: '4.5', height: '6.5' },
      { template_name: 'A'.repeat(100) },
      { template_content: 'Line1\nLine2\nLine3' },
      { label_type: 'Finished Product', width: 12.12, height: 24.24 },
    ])('Update DTO should accept optional payload: %p', async (payload) => {
      const dto = plainToInstance(UpdateLabelTemplateDto, payload as any);

      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it.each([
      { template_name: '' },
      { template_name: 'A'.repeat(101) },
      { label_type: 'Invalid Type' },
      { width: 0 },
      { width: -1 },
      { width: 100 },
      { width: 'abc' },
      { height: 0 },
      { height: -1 },
      { height: 100 },
      { height: 'abc' },
      { template_name: 123 },
      { label_type: 123 },
      { template_content: 555 },
    ])('Update DTO should reject invalid payload: %p', async (payload) => {
      const dto = plainToInstance(UpdateLabelTemplateDto, payload as any);

      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it.each([
      { template_id: 'RAW-001' },
      { template_id: 'RAW-001', lot_id: 'LOT-001' },
      { template_id: 'RAW-001', batch_id: 'BATCH-001' },
      { template_id: 'RAW-001', lot_id: 'LOT-001', batch_id: 'BATCH-001' },
      { template_id: 'X', lot_id: 'L', batch_id: 'B' },
      { template_id: '12345678901234567890' },
      { template_id: 'RAW-001', lot_id: '' },
      { template_id: 'RAW-001', batch_id: '' },
      { template_id: 'RAW-001', lot_id: undefined, batch_id: undefined },
      { template_id: 'RAW-001', lot_id: 'LOT-UNICODE-Á' },
      { template_id: 'RAW-001', batch_id: 'バッチ-001' },
    ])('Generate DTO should accept payload: %p', async (payload) => {
      const dto = plainToInstance(GenerateLabelDto, payload as any);

      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it.each([
      {},
      { template_id: '' },
      { template_id: null },
      { template_id: undefined },
      { template_id: 123 },
      { template_id: true },
      { template_id: 'RAW-001', lot_id: 123 },
      { template_id: 'RAW-001', lot_id: false },
      { template_id: 'RAW-001', lot_id: {} },
      { template_id: 'RAW-001', batch_id: 123 },
      { template_id: 'RAW-001', batch_id: false },
      { template_id: 'RAW-001', batch_id: {} },
    ])('Generate DTO should reject payload: %p', async (payload) => {
      const dto = plainToInstance(GenerateLabelDto, payload as any);

      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should include ValidationError metadata for missing required fields', async () => {
      const dto = plainToInstance(CreateLabelTemplateDto, {});
      const errors = await validate(dto);
      const errorFields = errors.map((err) => err.property);

      expect(errorFields).toEqual(
        expect.arrayContaining([
          'template_id',
          'template_name',
          'label_type',
          'template_content',
          'width',
          'height',
        ]),
      );
      expect(errors.every((err) => typeof err.property === 'string')).toBe(
        true,
      );
      expect(
        errors.some(
          (err) => err.constraints && Object.keys(err.constraints).length > 0,
        ),
      ).toBe(true);
    });
  });
});
