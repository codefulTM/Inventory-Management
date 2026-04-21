export const REDIS_ID_CLIENT = 'REDIS_ID_CLIENT';

/**
 * Redis key map for each entity type.
 * Each key tracks the INCR counter in Redis db 1.
 */
export const REDIS_ID_KEY_MAP = {
  MAT: 'id:material',
  LOT: 'id:lot',
  TXN: 'id:transaction',
  ADJ: 'id:adjustment',
  WH: 'id:warehouse',
  LOC: 'id:location',
  SLP: 'id:slip',
  ORD: 'id:order',
  RPT: 'id:report',
  BAT: 'id:batch',
  LBL: 'id:label',
  QC: 'id:qc',
  BC: 'id:batch-component',
} as const;

export type IdPrefix = keyof typeof REDIS_ID_KEY_MAP;
