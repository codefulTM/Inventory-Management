/**
 * E2E tests — analytics-indexer-service full sync pipeline
 *
 * Exercises the complete data flow:
 *   SyncScheduler → SyncService → {Collection}Sync → ElasticsearchBulkService
 *
 * No real MongoDB, Elasticsearch, or Redis is required.
 * Mongoose models are mocked to return controlled document sets.
 * The ES client is mocked to capture what gets bulk-indexed / deleted.
 * Redis is mocked to verify watermark read/write sequencing.
 */
import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { getModelToken } from "@nestjs/mongoose";

import { SyncService, RunFullSyncSummary } from "../src/sync/sync.service";
import { SyncScheduler } from "../src/sync/sync.scheduler";
import { InventoryLotsSync } from "../src/sync/collections/inventory-lots.sync";
import { InventoryTransactionsSync } from "../src/sync/collections/inventory-transactions.sync";
import { QCTestsSync } from "../src/sync/collections/qc-tests.sync";
import { MaterialsSync } from "../src/sync/collections/materials.sync";
import { AuditLogsSync } from "../src/sync/collections/audit-logs.sync";
import { ImportExportOrdersSync } from "../src/sync/collections/import-export-orders.sync";
import { ElasticsearchBulkService } from "../src/elasticsearch/elasticsearch-bulk.service";
import { IndexNamingService } from "../src/elasticsearch/index-naming.service";
import { RedisWatermarkService } from "../src/redis/redis-watermark.service";
import { ELASTICSEARCH_CLIENT } from "../src/elasticsearch/elasticsearch.constants";
import { REDIS_CLIENT } from "../src/redis/redis.constants";
import { InventoryLot } from "../src/schemas/inventory-lot.schema";
import { InventoryTransaction } from "../src/schemas/inventory-transaction.schema";
import { QCTest } from "../src/schemas/qc-test.schema";
import { Material } from "../src/schemas/material.schema";
import { InventoryAuditReport } from "../src/schemas/inventory-audit-report.schema";
import { ImportExportOrder } from "../src/schemas/import-export-order.schema";

// ── helpers ────────────────────────────────────────────────────────────────

const NOW = new Date("2026-04-19T12:00:00.000Z");

/** Creates a chainable Mongoose model mock whose find().sort().skip().limit().lean().exec() returns `docs`. */
function makeModelMock(docs: any[]) {
  const execFn = jest.fn().mockResolvedValue(docs);
  const chain: any = {};
  chain.find = jest.fn().mockReturnValue(chain);
  chain.sort = jest.fn().mockReturnValue(chain);
  chain.skip = jest.fn().mockReturnValue(chain);
  chain.limit = jest.fn().mockReturnValue(chain);
  chain.lean = jest.fn().mockReturnValue(chain);
  chain.exec = execFn;
  return chain;
}

/** Returns a fake BulkResult as the ES client bulk() response. */
function makeBulkResponse(count: number) {
  return {
    items: Array.from({ length: count }, (_, i) => ({
      index: { _id: `id-${i}`, result: "created" },
      delete: undefined,
    })),
  };
}

function makeDeleteResponse(count: number) {
  return {
    items: Array.from({ length: count }, (_, i) => ({
      delete: { _id: `id-${i}`, result: "deleted" },
      index: undefined,
    })),
  };
}

function makeSummary(): RunFullSyncSummary {
  return {
    cycleTo: NOW.toISOString(),
    dryRun: false,
    results: [],
    totalIndexed: 0,
    totalDeleted: 0,
    totalErrors: 0,
  };
}

// ── fixture factory ────────────────────────────────────────────────────────

async function buildModule(overrides: {
  lotsModel?: any;
  transactionsModel?: any;
  qcModel?: any;
  materialsModel?: any;
  auditModel?: any;
  ordersModel?: any;
  watermarkGet?: jest.Mock;
  watermarkSet?: jest.Mock;
  esBulk?: jest.Mock;
  esDelete?: jest.Mock;
}) {
  const lotsModel = overrides.lotsModel ?? makeModelMock([]);
  const transactionsModel = overrides.transactionsModel ?? makeModelMock([]);
  const qcModel = overrides.qcModel ?? makeModelMock([]);
  const materialsModel = overrides.materialsModel ?? makeModelMock([]);
  const auditModel = overrides.auditModel ?? makeModelMock([]);
  const ordersModel = overrides.ordersModel ?? makeModelMock([]);

  const watermarkGetFn =
    overrides.watermarkGet ?? jest.fn().mockResolvedValue(null);
  const watermarkSetFn =
    overrides.watermarkSet ?? jest.fn().mockResolvedValue(undefined);

  const esBulkFn =
    overrides.esBulk ?? jest.fn().mockResolvedValue(makeBulkResponse(0));
  const esDeleteFn =
    overrides.esDelete ?? jest.fn().mockResolvedValue(makeDeleteResponse(0));

  const mockEsClient = {
    bulk: jest.fn().mockImplementation(({ operations }) => {
      // Detect index vs delete by first operation type
      const isDelete = operations[0]?.delete !== undefined;
      const count = operations.length / (isDelete ? 1 : 2);
      return isDelete ? makeDeleteResponse(count) : makeBulkResponse(count);
    }),
  };

  const testModule: TestingModule = await Test.createTestingModule({
    providers: [
      SyncService,
      SyncScheduler,
      InventoryLotsSync,
      InventoryTransactionsSync,
      QCTestsSync,
      MaterialsSync,
      AuditLogsSync,
      ImportExportOrdersSync,
      IndexNamingService,
      ElasticsearchBulkService,
      {
        provide: ELASTICSEARCH_CLIENT,
        useValue: mockEsClient,
      },
      {
        provide: REDIS_CLIENT,
        useValue: {
          get: jest.fn().mockResolvedValue(null),
          set: jest.fn().mockResolvedValue("OK"),
        },
      },
      {
        provide: RedisWatermarkService,
        useValue: {
          getWatermark: watermarkGetFn,
          setWatermark: watermarkSetFn,
        },
      },
      {
        provide: ConfigService,
        useValue: { get: jest.fn().mockReturnValue(500) },
      },
      { provide: getModelToken(InventoryLot.name), useValue: lotsModel },
      {
        provide: getModelToken(InventoryTransaction.name),
        useValue: transactionsModel,
      },
      { provide: getModelToken(QCTest.name), useValue: qcModel },
      { provide: getModelToken(Material.name), useValue: materialsModel },
      {
        provide: getModelToken(InventoryAuditReport.name),
        useValue: auditModel,
      },
      { provide: getModelToken(ImportExportOrder.name), useValue: ordersModel },
    ],
  }).compile();

  return {
    testModule,
    syncService: testModule.get<SyncService>(SyncService),
    syncScheduler: testModule.get<SyncScheduler>(SyncScheduler),
    watermarkGet: watermarkGetFn,
    watermarkSet: watermarkSetFn,
    esClient: mockEsClient,
  };
}

// ── test suites ────────────────────────────────────────────────────────────

describe("Sync pipeline — full cycle (E2E)", () => {
  describe("Empty collections — baseline", () => {
    it("completes without errors when all collections are empty", async () => {
      const { syncService } = await buildModule({});
      await expect(syncService.runFullSync()).resolves.not.toThrow();
    });

    it("reads watermark for all 6 collections", async () => {
      const watermarkGet = jest.fn().mockResolvedValue(null);
      const { syncService } = await buildModule({ watermarkGet });

      await syncService.runFullSync();

      expect(watermarkGet).toHaveBeenCalledTimes(6);
      expect(watermarkGet).toHaveBeenCalledWith("inventory_lots");
      expect(watermarkGet).toHaveBeenCalledWith("inventory_transactions");
      expect(watermarkGet).toHaveBeenCalledWith("qc_tests");
      expect(watermarkGet).toHaveBeenCalledWith("materials");
      expect(watermarkGet).toHaveBeenCalledWith("inventory_audit_reports");
      expect(watermarkGet).toHaveBeenCalledWith("import_export_orders");
    });

    it("writes watermark for all 6 collections after empty sync", async () => {
      const watermarkSet = jest.fn().mockResolvedValue(undefined);
      const { syncService } = await buildModule({ watermarkSet });

      await syncService.runFullSync();

      expect(watermarkSet).toHaveBeenCalledTimes(6);
    });

    it("does NOT call ES bulk when all collections are empty", async () => {
      const { syncService, esClient } = await buildModule({});

      await syncService.runFullSync();

      expect(esClient.bulk).not.toHaveBeenCalled();
    });
  });

  describe("Live documents — inventory_lots collection", () => {
    const liveLot = {
      _id: { toString: () => "lot-mongo-001" },
      lot_id: "lot-001",
      material_id: "MAT-001",
      quantity: 500,
      status: "Quarantine",
      modified_date: new Date("2026-04-19T10:00:00.000Z"),
      created_date: new Date("2026-03-01T00:00:00.000Z"),
    };

    it("bulk-indexes 1 live lot document into the monthly index", async () => {
      // First call returns the document; second call (next page) returns empty
      const lotsModel = makeModelMock([liveLot]);
      lotsModel.exec.mockResolvedValueOnce([liveLot]).mockResolvedValueOnce([]);

      const { syncService, esClient } = await buildModule({ lotsModel });

      await syncService.runFullSync();

      expect(esClient.bulk).toHaveBeenCalledTimes(1);
      const bulkOps = esClient.bulk.mock.calls[0][0].operations;
      // First op is the index command, second is the body
      expect(bulkOps[0]).toEqual(
        expect.objectContaining({
          index: expect.objectContaining({ _index: "inventory_lots_2026_04" }),
        }),
      );
    });

    it("watermark is updated to the cycle timestamp after successful index", async () => {
      const lotsModel = makeModelMock([liveLot]);
      lotsModel.exec.mockResolvedValueOnce([liveLot]).mockResolvedValueOnce([]);

      const watermarkSet = jest.fn().mockResolvedValue(undefined);
      const { syncService } = await buildModule({ lotsModel, watermarkSet });

      await syncService.runFullSync();

      const lotsCalls = (watermarkSet as jest.Mock).mock.calls.filter(
        (c) => c[0] === "inventory_lots",
      );
      expect(lotsCalls).toHaveLength(1);
      expect(lotsCalls[0][1]).toBeInstanceOf(Date);
    });
  });

  describe("Soft-deleted documents", () => {
    it("routes doc with deleted=true to bulkDelete, not bulkIndex", async () => {
      const deletedLot = {
        _id: { toString: () => "lot-deleted-001" },
        lot_id: "lot-deleted",
        deleted: true,
        modified_date: new Date("2026-04-19T10:00:00.000Z"),
        created_date: new Date("2026-03-01T00:00:00.000Z"),
      };

      const lotsModel = makeModelMock([]);
      lotsModel.exec
        .mockResolvedValueOnce([deletedLot])
        .mockResolvedValueOnce([]);

      const { syncService, esClient } = await buildModule({ lotsModel });

      await syncService.runFullSync();

      expect(esClient.bulk).toHaveBeenCalledTimes(1);
      const bulkOps = esClient.bulk.mock.calls[0][0].operations;
      // Delete operations only have one entry per id (no body)
      expect(bulkOps[0]).toEqual(
        expect.objectContaining({
          delete: expect.objectContaining({ _id: "lot-deleted-001" }),
        }),
      );
    });

    it("routes doc with is_active=false to bulkDelete", async () => {
      const inactiveLot = {
        _id: { toString: () => "lot-inactive-001" },
        is_active: false,
        modified_date: new Date("2026-04-19T10:00:00.000Z"),
      };

      const lotsModel = makeModelMock([]);
      lotsModel.exec
        .mockResolvedValueOnce([inactiveLot])
        .mockResolvedValueOnce([]);

      const { syncService, esClient } = await buildModule({ lotsModel });

      await syncService.runFullSync();

      expect(esClient.bulk).toHaveBeenCalledTimes(1);
      const ops = esClient.bulk.mock.calls[0][0].operations;
      expect(ops[0]).toHaveProperty("delete");
    });
  });

  describe("Multi-collection sync — all 6 collections have data", () => {
    function makeDoc(id: string, date: Date) {
      return {
        _id: { toString: () => id },
        modified_date: date,
        created_date: date,
      };
    }

    it("syncs all 6 collections and makes 6 ES bulk calls", async () => {
      const doc = makeDoc("id-001", new Date("2026-04-19T10:00:00.000Z"));
      const makeModel = () => {
        const m = makeModelMock([]);
        m.exec.mockResolvedValueOnce([doc]).mockResolvedValueOnce([]);
        return m;
      };

      const { syncService, esClient } = await buildModule({
        lotsModel: makeModel(),
        transactionsModel: makeModel(),
        qcModel: makeModel(),
        materialsModel: makeModel(),
        auditModel: makeModel(),
        ordersModel: makeModel(),
      });

      await syncService.runFullSync();

      expect(esClient.bulk).toHaveBeenCalledTimes(6);
    });

    it("uses correct index names for each collection", async () => {
      const date = new Date("2026-04-19T10:00:00.000Z");
      const makeModel = (name: string) => {
        const doc = {
          _id: { toString: () => `${name}-001` },
          modified_date: date,
          created_date: date,
        };
        const m = makeModelMock([]);
        m.exec.mockResolvedValueOnce([doc]).mockResolvedValueOnce([]);
        return m;
      };

      const { syncService, esClient } = await buildModule({
        lotsModel: makeModel("lot"),
        transactionsModel: makeModel("txn"),
        qcModel: makeModel("qc"),
        materialsModel: makeModel("mat"),
        auditModel: makeModel("audit"),
        ordersModel: makeModel("order"),
      });

      await syncService.runFullSync();

      const indexNames = esClient.bulk.mock.calls.map(
        (c: any) => c[0].operations[0]?.index?._index,
      );
      expect(indexNames).toContain("inventory_lots_2026_04");
      expect(indexNames).toContain("inventory_transactions_2026_04");
      expect(indexNames).toContain("qc_tests_2026_04");
      expect(indexNames).toContain("materials_2026_04");
      expect(indexNames).toContain("inventory_audit_reports_2026_04");
      expect(indexNames).toContain("import_export_orders_2026_04");
    });
  });

  describe("Failure isolation — one collection failing", () => {
    it("does NOT update watermark for failed collection", async () => {
      const failModel = makeModelMock([]);
      failModel.exec.mockRejectedValue(new Error("MongoDB timeout"));

      const watermarkSet = jest.fn().mockResolvedValue(undefined);
      const { syncService } = await buildModule({
        lotsModel: failModel,
        watermarkSet,
      });

      await syncService.runFullSync();

      const calls = (watermarkSet as jest.Mock).mock.calls.map((c) => c[0]);
      expect(calls).not.toContain("inventory_lots");
      // other 5 collections succeed
      expect(watermarkSet).toHaveBeenCalledTimes(5);
    });

    it("continues syncing remaining collections after one fails", async () => {
      const failModel = makeModelMock([]);
      failModel.exec.mockRejectedValue(new Error("connection refused"));

      const materialsModel = makeModelMock([]);
      const doc = {
        _id: { toString: () => "mat-001" },
        modified_date: new Date(),
        created_date: new Date(),
      };
      materialsModel.exec
        .mockResolvedValueOnce([doc])
        .mockResolvedValueOnce([]);

      const { syncService, esClient } = await buildModule({
        lotsModel: failModel,
        materialsModel,
      });

      await syncService.runFullSync();

      // Materials should still have been indexed despite lots failing
      const indexNames = (esClient.bulk.mock.calls as any[]).map(
        (c) => c[0].operations[0]?.index?._index,
      );
      expect(indexNames).toContain("materials_2026_04");
    });

    it("runFullSync itself does not throw even if a collection fails", async () => {
      const failModel = makeModelMock([]);
      failModel.exec.mockRejectedValue(new Error("disk full"));

      const { syncService } = await buildModule({ lotsModel: failModel });

      await expect(syncService.runFullSync()).resolves.not.toThrow();
    });
  });

  describe("Incremental sync — watermark is set", () => {
    it("passes watermark timestamp to model.find() as $gt filter", async () => {
      const prevWatermark = new Date("2026-04-18T00:00:00.000Z");
      const watermarkGet = jest.fn().mockResolvedValue(prevWatermark);

      const lotsModel = makeModelMock([]);

      const { syncService } = await buildModule({ lotsModel, watermarkGet });

      await syncService.runFullSync();

      const findArg = lotsModel.find.mock.calls[0][0];
      expect(findArg.modified_date.$gt).toEqual(prevWatermark);
    });

    it("performs full-history query when watermark is null", async () => {
      const watermarkGet = jest.fn().mockResolvedValue(null);
      const lotsModel = makeModelMock([]);

      const { syncService } = await buildModule({ lotsModel, watermarkGet });

      await syncService.runFullSync();

      const findArg = lotsModel.find.mock.calls[0][0];
      expect(findArg.modified_date.$gt).toBeUndefined();
      expect(findArg.modified_date.$lte).toBeInstanceOf(Date);
    });
  });

  describe("SyncScheduler — concurrency guard", () => {
    it("invokes runFullSync on each tick", async () => {
      const { syncScheduler, syncService } = await buildModule({});
      const spy = jest
        .spyOn(syncService, "runFullSync")
        .mockResolvedValue(makeSummary());

      await syncScheduler.runSync();

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it("skips tick when previous cycle is still running", async () => {
      const { syncScheduler, syncService } = await buildModule({});

      let resolveSync!: (value: RunFullSyncSummary) => void;
      const hangingPromise = new Promise<RunFullSyncSummary>((res) => {
        resolveSync = res;
      });
      const spy = jest
        .spyOn(syncService, "runFullSync")
        .mockReturnValue(hangingPromise as any);

      // First tick starts but doesn't finish
      const firstTick = syncScheduler.runSync();
      // Second tick should be skipped
      await syncScheduler.runSync();

      expect(spy).toHaveBeenCalledTimes(1);

      resolveSync(makeSummary());
      await firstTick;
    });

    it("resets running flag after sync completes", async () => {
      const { syncScheduler, syncService } = await buildModule({});
      jest.spyOn(syncService, "runFullSync").mockResolvedValue(makeSummary());

      await syncScheduler.runSync();
      await syncScheduler.runSync();

      expect(syncService.runFullSync).toHaveBeenCalledTimes(2);
    });

    it("resets running flag even when sync throws", async () => {
      const { syncScheduler, syncService } = await buildModule({});
      jest
        .spyOn(syncService, "runFullSync")
        .mockRejectedValue(new Error("crash"));

      await syncScheduler.runSync();
      await syncScheduler.runSync();

      expect(syncService.runFullSync).toHaveBeenCalledTimes(2);
    });
  });
});
