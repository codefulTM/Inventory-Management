import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { BackendDataService } from './backend-data.service';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'BACKEND_AI_DATA',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'inventory',
            protoPath: join(__dirname, '../../proto/inventory.proto'),
            url: config.get<string>('BACKEND_GRPC_URL', 'localhost:50052'),
            loader: {
              keepCase: true,
              longs: String,
              enums: String,
              defaults: false,
              oneofs: true,
            },
          },
        }),
      },
    ]),
  ],
  providers: [BackendDataService],
  exports: [BackendDataService],
})
export class BackendClientModule {}
