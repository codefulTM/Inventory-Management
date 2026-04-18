// Jest setup file to mock modules before any tests run
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234-5678-90ab-cdef'),
  NIL: '00000000-0000-0000-0000-000000000000',
  MAX: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
}), { virtual: true });
