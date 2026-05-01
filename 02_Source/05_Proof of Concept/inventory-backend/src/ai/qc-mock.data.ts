// Mock data cho QC Tests - dùng để test AI Analysis
export const QC_MOCK_DATA = [
  {
    id: 'QC-001',
    test_type: 'Microbial Testing',
    test_name: 'Vi sinh vật',
    test_result: '550 CFU/g',
    acceptance_criteria: '< 100 CFU/g',
    status: 'Failed',
    tested_date: '2026-02-18',
    material_name: 'Thực phẩm chức năng ABC',
    batch_number: 'BATCH-20260218-01',
  },
  {
    id: 'QC-002',
    test_type: 'Potency Testing',
    test_name: 'Độ tinh khiết',
    test_result: '98.5%',
    acceptance_criteria: '95-105%',
    status: 'Passed',
    tested_date: '2026-02-19',
    material_name: 'Vitamin D3 1000 IU',
    batch_number: 'BATCH-20260219-01',
  },
  {
    id: 'QC-003',
    test_type: 'Heavy Metal Testing',
    test_name: 'Kim loại nặng (Chì)',
    test_result: '0.95 ppm',
    acceptance_criteria: '< 1.0 ppm',
    status: 'Passed',
    tested_date: '2026-02-19',
    material_name: 'Protein Powder',
    batch_number: 'BATCH-20260219-02',
  },
  {
    id: 'QC-004',
    test_type: 'Moisture Content',
    test_name: 'Độ ẩm',
    test_result: '5.8%',
    acceptance_criteria: '< 6.0%',
    status: 'Borderline',
    tested_date: '2026-02-20',
    material_name: 'Bột nghệ hữu cơ',
    batch_number: 'BATCH-20260220-01',
  },
  {
    id: 'QC-005',
    test_type: 'pH Level',
    test_name: 'Độ pH',
    test_result: '3.2',
    acceptance_criteria: '3.5-4.5',
    status: 'Failed',
    tested_date: '2026-02-20',
    material_name: 'Nước trái cây ép',
    batch_number: 'BATCH-20260220-02',
  },
];

export interface QCTestRecord {
  id: string;
  test_type: string;
  test_name: string;
  test_result: string;
  acceptance_criteria: string;
  status: string;
  tested_date: string;
  material_name: string;
  batch_number: string;
}
