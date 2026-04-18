import { Injectable } from '@nestjs/common';
import { register, Counter, Histogram, Gauge } from 'prom-client';

@Injectable()
export class MetricsService {
  private httpRequestDuration: Histogram;
  private httpRequestTotal: Counter;
  private inventoryLotTotal: Gauge;
  private inventoryTransactionTotal: Counter;
  private qcTestTotal: Counter;
  private productionBatchTotal: Gauge;
  private apiErrorTotal: Counter;
  private databaseQueryDuration: Histogram;

  constructor() {
    this.initializeMetrics();
  }

  private initializeMetrics(): void {
    // HTTP Request Duration (in seconds)
    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.5, 1, 2, 5],
    });

    // HTTP Request Total
    this.httpRequestTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
    });

    // Inventory Lot Count
    this.inventoryLotTotal = new Gauge({
      name: 'inventory_lots_total',
      help: 'Total number of inventory lots',
      labelNames: ['status'],
    });

    // Inventory Transaction Count
    this.inventoryTransactionTotal = new Counter({
      name: 'inventory_transactions_total',
      help: 'Total number of inventory transactions',
      labelNames: ['type'],
    });

    // QC Tests Count
    this.qcTestTotal = new Counter({
      name: 'qc_tests_total',
      help: 'Total number of QC tests performed',
      labelNames: ['result', 'material_type'],
    });

    // Production Batch Count
    this.productionBatchTotal = new Gauge({
      name: 'production_batches_total',
      help: 'Total number of production batches',
      labelNames: ['status'],
    });

    // API Errors
    this.apiErrorTotal = new Counter({
      name: 'api_errors_total',
      help: 'Total number of API errors',
      labelNames: ['error_type', 'route'],
    });

    // Database Query Duration
    this.databaseQueryDuration = new Histogram({
      name: 'database_query_duration_seconds',
      help: 'Database query duration in seconds',
      labelNames: ['operation', 'collection'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1],
    });
  }

  /**
   * Record HTTP request metrics
   */
  recordHttpRequest(method: string, route: string, statusCode: number, durationMs: number): void {
    const statusCodeStr = statusCode.toString();
    this.httpRequestDuration.labels(method, route, statusCodeStr).observe(durationMs / 1000);
    this.httpRequestTotal.labels(method, route, statusCodeStr).inc();
  }

  /**
   * Record inventory lot metrics
   */
  recordInventoryLotCreated(status: string): void {
    this.inventoryLotTotal.labels(status).inc();
  }

  recordInventoryLotStatusChange(status: string, increment: number): void {
    this.inventoryLotTotal.labels(status).set(increment);
  }

  /**
   * Record inventory transaction metrics
   */
  recordInventoryTransaction(type: string): void {
    this.inventoryTransactionTotal.labels(type).inc();
  }

  /**
   * Record QC test metrics
   */
  recordQCTest(result: string, materialType: string): void {
    this.qcTestTotal.labels(result, materialType).inc();
  }

  /**
   * Record production batch metrics
   */
  recordProductionBatchCreated(status: string, count: number): void {
    this.productionBatchTotal.labels(status).set(count);
  }

  /**
   * Record API errors
   */
  recordApiError(errorType: string, route: string): void {
    this.apiErrorTotal.labels(errorType, route).inc();
  }

  /**
   * Record database query metrics
   */
  recordDatabaseQuery(operation: string, collection: string, durationMs: number): void {
    this.databaseQueryDuration.labels(operation, collection).observe(durationMs / 1000);
  }

  /**
   * Get all metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    return register.metrics();
  }

  /**
   * Get metrics registry
   */
  getRegistry() {
    return register;
  }
}
