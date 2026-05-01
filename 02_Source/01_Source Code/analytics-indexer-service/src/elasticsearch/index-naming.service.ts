import { Injectable } from '@nestjs/common';

@Injectable()
export class IndexNamingService {
  /**
   * Returns the monthly-partitioned Elasticsearch index name.
   * Pattern: {collection}_{YYYY}_{MM}
   * Example: inventory_lots_2026_04
   */
  getIndexName(collection: string, date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    return `${collection}_${year}_${month}`;
  }
}
