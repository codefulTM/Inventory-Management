// === BACKEND DATA SERVICE ===
// Service gọi dữ liệu từ backend (inventory-management-service) qua gRPC
// Cung cấp các phương thức thao tác với InventoryLot, Transaction, QC Test và RAG Search

import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ClientGrpc } from "@nestjs/microservices";
import { firstValueFrom, Observable } from "rxjs";

interface AiDataGrpcService {
  executeAction(req: { action: string; payload: string }): Observable<{ success: boolean; data: string; error: string }>;
}

export interface RagSearchHit {
  id: string; score: number; source_collection: string | null; source_type: string | null;
  source_id: string | null; rag_text: string; rag_metadata: Record<string, unknown>;
  acl_tags: string[]; updated_at: string | null;
}

export interface RagSearchResponse {
  query: string; top_k: number; total: number; hits: RagSearchHit[];
  search_mode: "semantic" | "hybrid"; used_embedding?: boolean; disabled_reason?: string;
}

@Injectable()
export class BackendDataService implements OnModuleInit {
  private readonly logger = new Logger(BackendDataService.name);
  private aiDataService: AiDataGrpcService;

  constructor(@Inject("BACKEND_AI_DATA") private readonly client: ClientGrpc) {}

  onModuleInit() {
    // [RÚT GỌN: Get AiDataService from gRPC client]
    throw new Error("Skeleton: not implemented");
  }

  private async execute<T>(action: string, payload?: Record<string, unknown>): Promise<T> {
    // [RÚT GỌN: Call gRPC executeAction, check success, parse JSON response]
    throw new Error("Skeleton: not implemented");
  }

  async getLotsStatistics(): Promise<unknown> {
    // [RÚT GỌN: Call execute('getLotsStatistics')]
    throw new Error("Skeleton: not implemented");
  }

  async getExpiringSoon(days?: number): Promise<unknown> {
    // [RÚT GỌN: Call execute('getExpiringSoon', { days })]
    throw new Error("Skeleton: not implemented");
  }

  async getExpiredLots(): Promise<unknown> {
    // [RÚT GỌN: Call execute('getExpiredLots')]
    throw new Error("Skeleton: not implemented");
  }

  async getTransactions(page?: number, limit?: number): Promise<unknown> {
    // [RÚT GỌN: Call execute('getTransactions', { page, limit })]
    throw new Error("Skeleton: not implemented");
  }

  async semanticSearch(query: string, topK: number, collections?: string[]): Promise<RagSearchResponse> {
    // [RÚT GỌN: Call execute('semanticSearch', { query, topK, collections })]
    throw new Error("Skeleton: not implemented");
  }

  async hybridSearch(query: string, embedding: number[], topK: number, collections?: string[]): Promise<RagSearchResponse> {
    // [RÚT GỌN: Call execute('hybridSearch', { query, embedding, topK, collections })]
    throw new Error("Skeleton: not implemented");
  }

  async createInventoryLot(payload: Record<string, unknown>): Promise<unknown> {
    // [RÚT GỌN: Call execute('createInventoryLot', payload)]
    throw new Error("Skeleton: not implemented");
  }

  async findInventoryLotById(lotId: string): Promise<unknown> {
    // [RÚT GỌN: Call execute('findInventoryLotById', { lot_id: lotId })]
    throw new Error("Skeleton: not implemented");
  }

  async updateInventoryLot(payload: Record<string, unknown>): Promise<unknown> {
    // [RÚT GỌN: Call execute('updateInventoryLot', payload)]
    throw new Error("Skeleton: not implemented");
  }

  async submitQCDecision(payload: Record<string, unknown>): Promise<unknown> {
    // [RÚT GỌN: Call execute('submitQCDecision', payload)]
    throw new Error("Skeleton: not implemented");
  }

  async getDashboardKPI(): Promise<unknown> {
    // [RÚT GỌN: Call execute('getDashboardKPI')]
    throw new Error("Skeleton: not implemented");
  }

  async getSupplierPerformance(): Promise<unknown> {
    // [RÚT GỌN: Call execute('getSupplierPerformance')]
    throw new Error("Skeleton: not implemented");
  }
}
