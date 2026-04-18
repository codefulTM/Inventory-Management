import { MongooseModuleOptions } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';

// -----------------------------------------------------------------------------
// Trợ giúp cấu hình cho Mongoose
// -----------------------------------------------------------------------------
// Tập tin này giữ các thiết lập kết nối MongoDB/Mongoose ở một nơi duy nhất
// để toàn bộ ứng dụng có thể import các tuỳ chọn hoặc hàm factory(một hàm tạo
// ra tùy chọn) khi thiết lập DatabaseModule.
//
// Khi ứng dụng khởi động, `DatabaseModule` (hoặc AppModule gốc) có thể gọi
// `MongooseModule.forRootAsync({ useFactory: mongooseConfigFactory })`. Các
// biến môi trường được đọc bởi `ConfigService`; nếu không có giá trị
// nào được cung cấp thì sử dụng DEFAULT_MONGO_URI ở dưới.
// -----------------------------------------------------------------------------

/**
 * Chuỗi kết nối mặc định được dùng khi ConfigService không trả về biến nào.
 * Đây chỉ là một constant cứng – không đọc `process.env` trực tiếp.
 */
export const DEFAULT_MONGO_URI: string =
  'mongodb://admin:password123@localhost:27017/inventory_db?authSource=admin';

/**
 * Các tuỳ chọn chung cho module mongoose. Những thiết lập này được giữ tối giản;
 * các cấu hình bổ sung (plugin, chế độ debug, v.v.) có thể thêm khi dự án tiến
 * triển.
 */
export const mongooseOptions: MongooseModuleOptions = {
  autoCreate: true, // automatically create collections defined by schemas
  autoIndex: process.env.NODE_ENV !== 'production',
  // debug: process.env.NODE_ENV !== 'production',
};

/**
 * Hàm factory tương thích với `MongooseModule.forRootAsync()`.
 */
export function mongooseConfigFactory(
  config: ConfigService,
): MongooseModuleOptions {
  const uri =
    config.get<string>('MONGODB_URI') ||
    config.get<string>('MONGO_URI') ||
    DEFAULT_MONGO_URI;

  return {
    ...mongooseOptions,
    uri,
  } as MongooseModuleOptions;
}
