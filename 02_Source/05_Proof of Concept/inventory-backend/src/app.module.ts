import {Module} from '@nestjs/common';
import {ConfigModule} from '@nestjs/config';
import {AppController} from './app.controller';
import {AppService} from './app.service';
import {AuthModule} from './auth/auth.module'
import {TestModule} from './test/test.module'
import {AiModule} from './ai/ai.module';
import {BarcodeModule} from './barcode/barcode.module';
import {QRCodeModule} from './qrcode/qrcode.module';

@Module({
  imports: [
    ConfigModule.forRoot({isGlobal: true}),
    AuthModule,
    TestModule,
    AiModule,
    BarcodeModule,
    QRCodeModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
}
