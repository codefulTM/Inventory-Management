// === qc-test.service.ts ===
// Service quản lý QC test cho lô tồn kho
// Key methods: getAllTests, getTestById, createTest, initTestFromBatch, updateTest, submitDecision, submitRetestDecision, getDashboardKPI
// API: MongoDB (QCTestRepository), InventoryLotService, ProductionBatchService, RedisIdService

@Injectable()
export class QCTestService {
  constructor(
    private readonly repository: QCTestRepository,
    private readonly inventoryLotService: InventoryLotService,
    private readonly productionBatchService: ProductionBatchService,
    private readonly redisIdService: RedisIdService,
  ) {}

  /**
   * Get all QC tests with optional filters
   */
  async getAllTests(filter?: {
    result_status?: string;
    test_type?: string;
  }): Promise<QCTestDocument[]> {
    // [SKELETON: Query all tests with optional filters → Return tests array]
  }

  /**
   * Get QC test by ID
   */
  async getTestById(test_id: string): Promise<QCTestDocument> {
    // [SKELETON: Find test by test_id → Return or throw NotFound]
  }

  /**
   * Get tests by lot ID
   */
  async getTestsByLotId(lot_id: string): Promise<QCTestDocument[]> {
    // [SKELETON: Validate lot exists → Find tests by lot_id → Return tests array]
  }

  /**
   * Create new QC test
   */
  async createTest(dto: CreateQCTestDto): Promise<QCTestDocument> {
    // [SKELETON: Validate lot exists → Generate test_id → Create test in MongoDB → Return created test]
  }

  /**
   * Create QC test from production batch
   */
  async initTestFromBatch(
    batch_id: string,
    dto: {
      performed_by: string;
      test_type?: CreateQCTestDto['test_type'];
      test_method?: string;
      acceptance_criteria?: string;
    },
  ): Promise<QCTestDocument> {
    // [SKELETON: Find batch → Find matching lot → Check pending QC doesn't exist → Create test → Return created test]
  }

  /**
   * Update QC test
   */
  async updateTest(
    test_id: string,
    dto: UpdateQCTestDto,
  ): Promise<QCTestDocument> {
    // [SKELETON: Update test by test_id → Return updated test or throw NotFound]
  }

  /**
   * Delete QC test
   */
  async deleteTest(test_id: string): Promise<{ deleted: boolean }> {
    // [SKELETON: Delete test by test_id → Return deleted flag or throw NotFound]
  }

  /**
   * Submit QC decision (Accept/Reject/Quarantine)
   */
  async submitDecision(
    lot_id: string,
    dto: QCDecisionDto,
  ): Promise<{ lot: InventoryLotResponseDto; tests: QCTestDocument[] }> {
    // [SKELETON: Validate lot exists → Validate reject_reason if rejected → Update tests with decision → Update lot status → Return lot and updated tests]
  }

  /**
   * Submit retest decision (extend expiry or discard lot)
   */
  async submitRetestDecision(
    lot_id: string,
    action: 'extend' | 'discard',
    dto: { new_expiry_date?: string; performed_by: string },
  ): Promise<InventoryLotResponseDto> {
    // [SKELETON: Validate lot exists → Validate action → If extend: validate expiry date → Update lot → Create retest record → Return updated lot]
  }

  /**
   * Get dashboard KPI (pending, approved, rejected, error rate)
   */
  async getDashboardKPI(): Promise<{
    pending_count: number;
    approved_count: number;
    rejected_count: number;
    error_rate: number;
  }> {
    // [SKELETON: Count quarantine lots (pending) → Count passed/failed this month → Calculate error rate → Return KPI object]
  }

  /**
   * Get supplier performance metrics
   */
  async getSupplierPerformance(filter?: {
    from?: string;
    to?: string;
  }): Promise<
    Array<{
      supplier_name: string;
      total_batches: number;
      approved: number;
      rejected: number;
      quality_rate: number;
    }>
  > {
    // [SKELETON: Query tests in date range → Group by supplier → Calculate approved/rejected/quality_rate → Return array]
  }
}