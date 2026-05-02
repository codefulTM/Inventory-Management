/**
 * File: proxy.module.ts
 * Mô tả: Module proxy (Proxy Module)
 * Chức năng: Đóng gói ProxyController — chuyển tiếp HTTP request đến backend và ai-service
 * 
 * ProxyController đóng vai trò reverse proxy, forward mọi request
 * không thuộc /auth/* và /reports/* đến các service tương ứng
 */
import { Module } from '@nestjs/common';
import { ProxyController } from './proxy.controller';

@Module({
  controllers: [ProxyController],
})
export class ProxyModule {}
