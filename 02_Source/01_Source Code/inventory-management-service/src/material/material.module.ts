import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Material, MaterialSchema } from '../schemas/material.schema';
import { MaterialController } from './material.controller';
import { MaterialService } from './material.service';
import { MaterialRepository } from './material.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Material.name, schema: MaterialSchema },
    ]),
  ],
  controllers: [MaterialController],
  providers: [MaterialRepository, MaterialService],
  exports: [MaterialService],
})
export class MaterialModule {}
