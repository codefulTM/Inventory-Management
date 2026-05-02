import { MongooseModuleOptions } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';

// -----------------------------------------------------------------------------
// Cấu hình kết nối MongoDB/Mongoose
// -----------------------------------------------------------------------------
// File này tập trung hóa các thiết lập kết nối MongoDB cho toàn bộ ứng dụng.
// Khi DatabaseModule khởi tạo, nó sẽ gọi mongooseConfigFactory() để lấy cấu hình.
// 
// Các biến môi trường được đọc bởi ConfigService:
// - MONGODB_URI: URI kết nối MongoDB chính
// - MONGO_URI: URI dự phòng (fallback)
// Nếu không có biến nào được cung cấp, sử dụng DEFAULT_MONGO_URI
// -----------------------------------------------------------------------------

/**
 * Chuỗi kết nối MongoDB mặc định
 * Sử dụng khi ConfigService không tìm thấy MONGODB_URI hoặc MONGO_URI
 * 
 * Cấu hình mặc định:
 * - Host: localhost:27017
 * - Database: inventory_db
 * - Username: admin / Password: password123
 * - Auth Source: admin (database chứa user xác thực)
 */
export const DEFAULT_MONGO_URI: string =
  'mongodb://admin:password123@localhost:27017/inventory_db?authSource=admin';

/**
 * Các tùy chọn chung cho Mongoose
 * - autoCreate: Tự động tạo collection khi khởi động (dựa trên Schema)
 * - autoIndex: Tự động tạo index (tắt ở production để tránh ảnh hưởng performance)
 */
export const mongooseOptions: MongooseModuleOptions = {
  autoCreate: true, // Tự động tạo collections từ schemas
  autoIndex: process.env.NODE_ENV !== 'production', // Chỉ auto-index ở dev
  // debug: process.env.NODE_ENV !== 'production', // Bật log query ở dev (đang tắt)
};

/**
 * Factory function tạo cấu hình Mongoose
 * Được sử dụng bởi MongooseModule.forRootAsync()
 * 
 * @param config - ConfigService để đọc biến môi trường
 * @returns MongooseModuleOptions - Cấu hình kết nối MongoDB
 */
export function mongooseConfigFactory(
  config: ConfigService,
): MongooseModuleOptions {
  // Đọc URI từ env, fallback qua nhiều biến và cuối cùng là default
  const uri =
    config.get<string>('MONGODB_URI') ||
    config.get<string>('MONGO_URI') ||
    DEFAULT_MONGO_URI;

  // Merge các tùy chọn chung với URI
  return {
    ...mongooseOptions,
    uri,
  } as MongooseModuleOptions;
}
