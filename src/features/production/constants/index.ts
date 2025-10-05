// Production Feature Constants

export const PRODUCTION_LINE_OPTIONS = [
  '증착1', '증착2', '증착1하도', '증착1상도', '증착2하도', '증착2상도', 
  '2코팅', '1코팅', '내부코팅1호기', '내부코팅2호기', '내부코팅3호기',
  '증착1하도(아)', '증착1상도(아)', '증착2하도(아)', '증착2상도(아)'
].sort((a, b) => a.localeCompare(b, 'ko'));

export const PRODUCTION_LINE_SORT_ORDER = [
  '증착1하도(아)',
  '증착1상도(아)',
  '증착1',
  '증착1하도',
  '증착1상도',
  '증착2하도(아)',
  '증착2상도(아)',
  '증착2',
  '증착2하도',
  '증착2상도',
  '2코팅',
  '1코팅',
  '내부코팅1호기',
  '내부코팅2호기',
  '내부코팅3호기'
];

export const BOX_TYPE_OPTIONS = ['정상', 'B급', '구분출하'];

export const RATIO_OPTIONS = {
  X_TO_ONE: ['1:1', '2:1', '3:1', '4:1', '5:1', '6:1'],
  ONE_TO_X: ['1:2', '1:3', '1:4', '1:5', '1:6', '1:7']
};

export const PRODUCTION_REPORT_LIMITS = {
  DEFAULT_LIST_LIMIT: 100,
  STATS_LIMIT: 1000,
  EXCEL_UPLOAD_BATCH_SIZE: 50
};

export const PRODUCTION_REPORT_FIELDS = {
  REQUIRED: ['workDate', 'productionLine', 'supplier', 'productName'],
  NUMERIC: [
    'orderQuantity', 'productionPerMinute', 'uph', 'inputQuantity', 
    'goodQuantity', 'defectQuantity', 'personnelCount', 'packagingUnit', 
    'boxCount', 'remainder'
  ],
  CALCULATED: ['yieldRate', 'defectRate']
};

export const PRODUCTION_REPORT_COLORS = {
  YIELD_RATE_GOOD: '#10b981', // green-500
  YIELD_RATE_WARNING: '#f59e0b', // amber-500
  YIELD_RATE_BAD: '#ef4444', // red-500
  DEFECT_RATE_GOOD: '#10b981', // green-500
  DEFECT_RATE_WARNING: '#f59e0b', // amber-500
  DEFECT_RATE_BAD: '#ef4444' // red-500
};

export const YIELD_RATE_THRESHOLDS = {
  EXCELLENT: 95,
  GOOD: 90,
  WARNING: 85
};

export const DEFECT_RATE_THRESHOLDS = {
  EXCELLENT: 2,
  GOOD: 5,
  WARNING: 10
};
