const { HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions/v2');
const { google } = require('googleapis');

const { chunkArray, initializeFirebase } = require('./utils');

const DAILY_REPORT_HEADERS = [
  '정렬ID', // 보조 정렬 컬럼 (A열, 숨김 처리)
  '작업일자',
  '라인',
  '발주번호',
  '발주처',
  '제품명',
  '부속명',
  '발주수량',
  '사양',
  '하도데이터',
  '상도데이터',
  '투입',
  '양품',
  '불량',
  '인원',
  '비율',
  '시간당생산량',
  '시작시간',
  '종료시간',
];

const LINE_NORMALIZATION_RULES = [
  { keyword: '증착1', normalized: '증착1' },
  { keyword: '증착2', normalized: '증착2' },
];

const BATCH_SIZE = 500;

const columnIndexToLetter = (index) => {
  let n = index;
  let result = '';
  while (n >= 0) {
    result = String.fromCharCode((n % 26) + 65) + result;
    n = Math.floor(n / 26) - 1;
  }
  return result;
};

const normalizeTimestamp = (value) => {
  if (!value) return '';
  if (typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'string') {
    return value;
  }
  return '';
};

const formatNumber = (value) => {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? value : parsed;
  }
  return '';
};

const formatArray = (value) => {
  if (!Array.isArray(value)) {
    return '';
  }
  return value.map((item) => String(item || '').trim()).filter(Boolean).join(', ');
};

const formatWorkDate = (value) => {
  if (!value) return '';
  
  // Firestore Timestamp 객체인 경우
  if (value && typeof value.toDate === 'function') {
    const date = value.toDate();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  // Date 객체인 경우
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  // 문자열인 경우
  if (typeof value === 'string') {
    // 이미 YYYY-MM-DD 형식이면 그대로 반환
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }
    // 다른 형식이면 파싱 시도
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return value;
  }
  
  return '';
};

const normalizeProductionLine = (line) => {
  if (!line) {
    return '';
  }

  const trimmed = String(line).trim();
  for (const rule of LINE_NORMALIZATION_RULES) {
    if (trimmed.includes(rule.keyword)) {
      return rule.normalized;
    }
  }

  return trimmed;
};

// 라인 정렬 순서 정의
const LINE_SORT_ORDER = {
  '증착1': 1,
  '증착2': 2,
  '2코팅': 3,
  '1코팅': 4,
  '내부코팅1호기': 5,
  '내부코팅2호기': 6,
  '내부코팅3호기': 7,
};

// 라인 정렬 순서 가져오기
const getLineSortOrder = (line) => {
  const normalizedLine = normalizeProductionLine(line || '');
  
  // 정확한 매칭
  if (LINE_SORT_ORDER.hasOwnProperty(normalizedLine)) {
    return LINE_SORT_ORDER[normalizedLine];
  }
  
  // 부분 매칭 (예: "내부코팅1호기"에 "내부코팅1"이 포함된 경우)
  for (const [key, order] of Object.entries(LINE_SORT_ORDER)) {
    if (normalizedLine.includes(key) || key.includes(normalizedLine)) {
      return order;
    }
  }
  
  // 매칭되지 않으면 큰 숫자 반환 (맨 뒤로)
  return 999;
};

// 정렬 ID 생성 함수 (작업일자_라인순서_시작시간_발주번호)
const generateSortId = (report) => {
  const workDate = formatWorkDate(report.workDate);
  const productionLine = normalizeProductionLine(report.productionLine || '');
  const startTime = report.startTime || '';
  const orderNumbers = Array.isArray(report.orderNumbers)
    ? report.orderNumbers.map(n => String(n || '').trim()).filter(Boolean).join(',')
    : String(report.orderNumbers || '').trim();

  // 라인 정렬 순서
  const lineSortOrder = getLineSortOrder(productionLine);

  // 정렬 키 생성: 작업일자_라인순서_시작시간_발주번호
  // 숫자로 변환하여 정렬 가능하게 만듦
  const dateSortKey = workDate ? workDate.replace(/-/g, '') : '99999999'; // YYYYMMDD
  const timeSortKey = startTime ? startTime.replace(/:/g, '') : '999999'; // HHMMSS
  const sortId = `${dateSortKey}_${String(lineSortOrder).padStart(3, '0')}_${timeSortKey}_${orderNumbers}`;

  return sortId;
};

const compareReports = (a, b) => {
  // 1순위: 작업일자
  let dateA = a.workDate;
  let dateB = b.workDate;
  
  // Firestore Timestamp 객체인 경우 Date로 변환
  if (dateA && typeof dateA.toDate === 'function') {
    dateA = dateA.toDate();
  }
  if (dateB && typeof dateB.toDate === 'function') {
    dateB = dateB.toDate();
  }
  
  const timeA = dateA ? (dateA instanceof Date ? dateA.getTime() : new Date(dateA).getTime()) : 0;
  const timeB = dateB ? (dateB instanceof Date ? dateB.getTime() : new Date(dateB).getTime()) : 0;

  if (timeA !== timeB) {
    return timeA - timeB;
  }

  // 2순위: 라인 (지정된 순서대로)
  const lineA = normalizeProductionLine(a.productionLine || '');
  const lineB = normalizeProductionLine(b.productionLine || '');
  const orderA = getLineSortOrder(lineA);
  const orderB = getLineSortOrder(lineB);
  
  if (orderA !== orderB) {
    return orderA - orderB;
  }
  
  // 같은 순서면 알파벳 순서로
  const lineCompare = lineA.localeCompare(lineB);
  if (lineCompare !== 0) {
    return lineCompare;
  }

  // 3순위: 시작시간
  const startTimeA = a.startTime || '';
  const startTimeB = b.startTime || '';
  const startTimeCompare = startTimeA.localeCompare(startTimeB);
  
  if (startTimeCompare !== 0) {
    return startTimeCompare;
  }

  // 4순위: 원본 리포트 ID (같은 원본에서 분할된 행들을 붙이기 위해)
  const originalIdA = a.originalId || a.id || '';
  const originalIdB = b.originalId || b.id || '';
  const originalIdCompare = originalIdA.localeCompare(originalIdB);
  
  if (originalIdCompare !== 0) {
    return originalIdCompare;
  }

  // 5순위: 발주번호 (같은 원본 리포트에서 분할된 경우 발주번호 순서로 정렬)
  const orderNumbersA = Array.isArray(a.orderNumbers) 
    ? a.orderNumbers.map(n => String(n || '').trim()).filter(Boolean).join(',')
    : String(a.orderNumbers || '').trim();
  const orderNumbersB = Array.isArray(b.orderNumbers)
    ? b.orderNumbers.map(n => String(n || '').trim()).filter(Boolean).join(',')
    : String(b.orderNumbers || '').trim();
  
  return orderNumbersA.localeCompare(orderNumbersB);
};

const getCoatingData = (report, type) => {
  // 먼저 processConditions에서 가져오기 (최신 데이터)
  const conditions = report.processConditions?.[type];
  if (conditions && conditions.conditions) {
    const result = String(conditions.conditions || '').trim();
    if (result) {
      return result;
    }
  }

  // processConditions가 없으면 직접 필드에서 가져오기 (레거시 데이터)
  const direct =
    type === 'undercoat' ? report.undercoatData : report.topcoatData;
  if (typeof direct === 'string' && direct.trim() !== '') {
    return direct.trim();
  }

  return '';
};

// 발주번호별 발주수량 조회 함수
const getOrderQuantities = async (db, orderNumbers) => {
  const quantities = {};
  
  for (const orderNumber of orderNumbers) {
    try {
      const docs = await db.collection('production-schedules')
        .where('orderNumber', '==', orderNumber)
        .limit(1)
        .get();
      
      if (!docs.empty) {
        const data = docs.docs[0].data();
        const qty = data.orderQuantity || data.발주 || 0;
        quantities[orderNumber] = typeof qty === 'number' 
          ? qty 
          : parseInt(String(qty).replace(/,/g, ''), 10) || 0;
      } else {
        quantities[orderNumber] = 0;
      }
    } catch (error) {
      logger.warn(`발주번호 ${orderNumber} 조회 실패:`, error.message);
      quantities[orderNumber] = 0;
    }
  }
  
  return quantities;
};

// 리포트를 발주번호별로 분할하는 함수
const splitReportByOrderNumbers = async (db, report) => {
  // 발주번호 배열 추출
  let orderNumbers = [];
  if (Array.isArray(report.orderNumbers)) {
    orderNumbers = report.orderNumbers.filter(num => num && String(num).trim() !== '');
  } else if (report.orderNumbers) {
    orderNumbers = String(report.orderNumbers)
      .split(',')
      .map(n => n.trim())
      .filter(Boolean);
  }
  
  // 발주번호가 없거나 1개면 그대로 반환
  if (orderNumbers.length <= 1) {
    return [report];
  }
  
  // 발주번호 분할 시작 (로그 제거 - 너무 많은 로그 출력 방지)
  
  // 발주번호별 발주수량 조회
  // 먼저 원본 리포트의 orderQuantities 배열 확인
  let orderQuantities = {};
  
  if (Array.isArray(report.orderQuantities) && report.orderQuantities.length === orderNumbers.length) {
    // 원본 리포트의 orderQuantities 배열이 있고 발주번호 개수와 일치하면 사용
    for (let i = 0; i < orderNumbers.length; i++) {
      const orderNumber = orderNumbers[i];
      const qty = report.orderQuantities[i];
      orderQuantities[orderNumber] = typeof qty === 'number' ? qty : (parseInt(String(qty).replace(/,/g, ''), 10) || 0);
    }
    
    // 원본 리포트의 orderQuantities 배열 사용 (로그 제거)
  } else {
    // 원본 리포트에 orderQuantities 배열이 없거나 개수가 맞지 않으면 production-schedules에서 조회
    orderQuantities = await getOrderQuantities(db, orderNumbers);
  }
  
  // 발주번호 정렬 (오래된 것부터 먼저 처리)
  // 발주번호는 보통 날짜나 순서가 포함되어 있으므로 문자열 정렬로 오래된 것부터 처리
  orderNumbers.sort((a, b) => {
    // 문자열 비교로 오름차순 정렬 (작은 값 = 오래된 것)
    return String(a).localeCompare(String(b));
  });
  
  // 발주번호 정렬 완료 (로그 제거)
  
  // 총 발주수량 계산
  const totalOrderQuantity = Object.values(orderQuantities).reduce((sum, qty) => sum + qty, 0);
  
  // 발주수량이 모두 0이면 균등 분배
  const useEqualDistribution = totalOrderQuantity === 0;
  
  // 로스율 설정 (5-10%, 평균 7.5% 사용)
  // 필요시 0.05 (5%) ~ 0.10 (10%) 사이로 조정 가능
  const LOSS_RATE = 0.075; // 7.5% (5-10%의 평균값)
  
  const splitReports = [];
  const totalInput = report.inputQuantity || 0;
  const totalGood = report.goodQuantity || 0;
  const totalDefect = report.defectQuantity || 0;
  
  let remainingInput = totalInput;
  let remainingGood = totalGood;
  let remainingDefect = totalDefect;
  
  // 부족분 처리 방식:
  // - 발주번호 순서대로 우선 채우기: 오래된 발주번호부터 먼저 채움
  // - 각 발주번호에 발주수량 + 로스율(5-10%) 할당
  //   예: 발주수량 5000 → 5000 + (5000 * 7.5%) = 5375개 할당
  // - 나머지는 다음 발주번호에 할당
  //   예: T10495-1(5000) → 5500개 할당, T10496-1(5000) → 나머지 2500개 할당
  
  for (let i = 0; i < orderNumbers.length; i++) {
    const orderNumber = orderNumbers[i];
    const orderQty = orderQuantities[orderNumber] || 0;
    
    // 마지막 발주번호면 나머지 모두 할당
    const isLast = i === orderNumbers.length - 1;
    
    let inputQty, goodQty, defectQty;
    
    if (useEqualDistribution) {
      // 균등 분배 (발주수량이 모두 0인 경우)
      if (isLast) {
        inputQty = remainingInput;
        goodQty = remainingGood;
        defectQty = remainingDefect;
      } else {
        inputQty = Math.round(totalInput / orderNumbers.length);
        goodQty = Math.round(totalGood / orderNumbers.length);
        defectQty = Math.round(totalDefect / orderNumbers.length);
        remainingInput -= inputQty;
        remainingGood -= goodQty;
        remainingDefect -= defectQty;
      }
    } else {
      // 발주번호 순서대로 우선 채우기
      if (isLast) {
        // 마지막 발주번호: 나머지 모두 할당
        inputQty = remainingInput;
        goodQty = remainingGood;
        defectQty = remainingDefect;
      } else {
        // 발주수량 + 로스율(7.5%) 계산
        const targetQty = Math.round(orderQty * (1 + LOSS_RATE));
        
        // 남은 양품수량이 목표 수량보다 많으면 목표 수량만큼 할당
        if (remainingGood >= targetQty) {
          goodQty = targetQty;
        } else {
          // 남은 양품수량이 목표 수량보다 적으면 남은 양품수량 모두 할당
          goodQty = remainingGood;
        }
        
        // 투입수량과 불량수량도 양품수량 비율로 계산
        // 양품수량 비율 = goodQty / totalGood
        const goodRatio = totalGood > 0 ? goodQty / totalGood : 0;
        inputQty = Math.round(totalInput * goodRatio);
        defectQty = Math.round(totalDefect * goodRatio);
        
        // 반올림 오차 보정: 마지막이 아니면 남은 값에서 빼기
        remainingInput -= inputQty;
        remainingGood -= goodQty;
        remainingDefect -= defectQty;
      }
    }
    
    // 분할된 리포트 생성
    const splitReport = {
      ...report,
      id: `${report.id}_${orderNumber}`, // 고유 ID 생성
      originalId: report.id, // 원본 ID 보관
      orderNumbers: [orderNumber], // 단일 발주번호만
      orderQuantity: orderQty, // 해당 발주번호의 발주수량
      inputQuantity: inputQty,
      goodQuantity: goodQty,
      defectQuantity: defectQty,
    };
    
    splitReports.push(splitReport);
    
    // 부족분 계산 (발주수량 대비 양품수량)
    const shortage = orderQty > 0 ? orderQty - goodQty : 0;
    const shortagePercent = orderQty > 0 ? ((shortage / orderQty) * 100).toFixed(2) : '0.00';
    
    // 목표 수량 계산 (발주수량 + 로스율)
    const targetQty = useEqualDistribution ? 0 : Math.round(orderQty * (1 + LOSS_RATE));
    
    // 발주번호 분할 완료 (로그 제거 - 각 발주번호마다 출력되어 너무 많음)
  }
  
  // 전체 분할 요약 로그
  const totalOrderQty = Object.values(orderQuantities).reduce((sum, qty) => sum + qty, 0);
  const totalGoodQty = splitReports.reduce((sum, r) => sum + (r.goodQuantity || 0), 0);
  const totalShortage = totalOrderQty - totalGoodQty;
  
  // 발주번호 분할 전체 요약 (로그 제거 - 너무 많은 로그 출력 방지)
  
  return splitReports;
};

const mapReportToRow = (report) => {
  const lineRatio = report.lineRatio || report.yieldRate || '';
  const hourlyProduction =
    formatNumber(
      report.uph !== undefined ? report.uph : report.productionPerMinute
    ) || '';

  const undercoatData = getCoatingData(report, 'undercoat');
  const topcoatData = getCoatingData(report, 'topcoat');

  // 하도/상도 데이터 추출 (로그 제거 - 너무 많은 로그 출력 방지)

  // 정렬 ID 생성
  const sortId = generateSortId(report);

  return [
    sortId, // 정렬 ID (A열, 숨김 처리)
    formatWorkDate(report.workDate),
    normalizeProductionLine(report.productionLine),
    formatArray(report.orderNumbers),
    '', // 발주처 - 빈 값 (수식이 자동으로 복사됨)
    '', // 제품명 - 빈 값 (수식이 자동으로 복사됨)
    '', // 부속명 - 빈 값 (수식이 자동으로 복사됨)
    formatNumber(report.orderQuantity),
    '', // 사양 - 빈 값 (수식이 자동으로 복사됨)
    undercoatData,
    topcoatData,
    formatNumber(report.inputQuantity),
    formatNumber(report.goodQuantity),
    formatNumber(report.defectQuantity),
    formatNumber(report.personnelCount),
    lineRatio,
    hourlyProduction,
    report.startTime || '',
    report.endTime || '',
  ];
};

const getSheetsClient = async (serviceAccountEmail, privateKey) => {
  try {
    let clientEmail = serviceAccountEmail?.trim();
    let key = privateKey?.trim().replace(/\\n/g, '\n').replace(/\\\\n/g, '\n');

    if (!clientEmail || !key) {
      throw new Error('Google 서비스 계정 정보가 설정되지 않았습니다.');
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: key,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const authClient = await auth.getClient();
    return google.sheets({ version: 'v4', auth: authClient });
  } catch (error) {
    logger.error('Google Sheets API 클라이언트 생성 실패:', {
      message: error.message,
      stack: error.stack,
    });
    throw new HttpsError('internal', `Google Sheets API 인증 실패: ${error.message}`);
  }
};

const fetchReportsForSync = async (db, forceFullSync) => {
  const results = [];

  if (forceFullSync) {
    logger.info('전체 동기화 모드: 모든 문서 가져오기');
    let lastDoc = null;
    let batchCount = 0;
    
    try {
      while (true) {
        let queryRef = db.collection('packaging-reports')
          .orderBy('workDate')
          .limit(BATCH_SIZE);

        if (lastDoc) {
          queryRef = queryRef.startAfter(lastDoc);
        }

        const snapshot = await queryRef.get();
        if (snapshot.empty) {
          logger.info(`전체 동기화: ${batchCount}개 배치 처리 완료, 총 ${results.length}개 문서`);
          break;
        }

        snapshot.docs.forEach((docSnap) => {
          const report = { id: docSnap.id, ...docSnap.data() };
          results.push(report);
        });

        batchCount++;
        lastDoc = snapshot.docs[snapshot.docs.length - 1];
        if (snapshot.size < BATCH_SIZE) {
          logger.info(`전체 동기화: ${batchCount}개 배치 처리 완료, 총 ${results.length}개 문서`);
          break;
        }
      }
    } catch (error) {
      if (error.code === 'failed-precondition' && error.message.includes('index')) {
        logger.warn('workDate 인덱스가 없어서 전체 문서를 가져옵니다 (정렬 없이)');
        const snapshot = await db.collection('packaging-reports').limit(BATCH_SIZE * 10).get();
        snapshot.docs.forEach((docSnap) => {
          const report = { id: docSnap.id, ...docSnap.data() };
          results.push(report);
        });
        logger.info(`전체 동기화: 인덱스 없이 ${results.length}개 문서 가져옴`);
      } else {
        throw error;
      }
    }

    return results;
  }

  logger.info('일반 동기화 모드: needsSheetSync=true 문서 또는 최근 업데이트된 문서 가져오기');
  
  // 먼저 needsSheetSync=true 플래그가 있는 문서 가져오기
  try {
    let lastDoc = null;
    let batchCount = 0;
    while (true) {
      let queryRef = db.collection('packaging-reports')
        .where('needsSheetSync', '==', true)
        .orderBy('updatedAt')
        .limit(BATCH_SIZE);

      if (lastDoc) {
        queryRef = queryRef.startAfter(lastDoc);
      }

      const snapshot = await queryRef.get();
      if (snapshot.empty) {
        logger.info(`needsSheetSync=true 문서: ${batchCount}개 배치 처리 완료, 총 ${results.length}개 문서`);
        break;
      }

      snapshot.docs.forEach((docSnap) => {
        const report = { id: docSnap.id, ...docSnap.data() };
        results.push(report);
      });

      batchCount++;
      lastDoc = snapshot.docs[snapshot.docs.length - 1];
      if (snapshot.size < BATCH_SIZE) {
        logger.info(`needsSheetSync=true 문서: ${batchCount}개 배치 처리 완료, 총 ${results.length}개 문서`);
        break;
      }
    }
  } catch (error) {
    if (error.code === 'failed-precondition' && error.message.includes('index')) {
      logger.warn('needsSheetSync+updatedAt 인덱스가 없어서 정렬 없이 가져옵니다.');
      // 인덱스가 없으면 정렬 없이 가져오기
      const snapshot = await db.collection('packaging-reports')
        .where('needsSheetSync', '==', true)
        .limit(BATCH_SIZE * 10)
        .get();
      
      snapshot.docs.forEach((docSnap) => {
        const report = { id: docSnap.id, ...docSnap.data() };
        results.push(report);
      });
      
      logger.info(`needsSheetSync=true 문서 (정렬 없이): ${results.length}개 가져옴`);
    } else {
      logger.error('needsSheetSync=true 문서 가져오기 실패:', error.message);
      throw error;
    }
  }

  // needsSheetSync 플래그가 있는 문서가 없으면, 최근 문서들을 가져온 후 lastSyncedAt이 없는 문서만 필터링
  if (results.length === 0) {
    logger.info('needsSheetSync=true 플래그가 있는 문서가 없어서 최근 문서들을 가져온 후 아직 동기화되지 않은 문서를 필터링합니다.');
    
    try {
      // 정렬 없이 최근 문서들을 가져오기 (최대 1000개)
      const snapshot = await db.collection('packaging-reports')
        .limit(1000)
        .get();
      
      snapshot.docs.forEach((docSnap) => {
        const report = { id: docSnap.id, ...docSnap.data() };
        // lastSyncedAt이 없는 문서만 추가 (아직 동기화되지 않은 문서)
        if (!report.lastSyncedAt) {
          results.push(report);
        }
      });
      
      logger.info(`최근 문서 중 동기화되지 않은 문서: ${results.length}개`);
      
      // 여전히 문서가 없으면, 모든 문서를 가져와서 필터링
      if (results.length === 0) {
        logger.info('동기화되지 않은 문서가 없어서 모든 문서를 확인합니다.');
        let allDocsSnapshot = await db.collection('packaging-reports')
          .limit(5000)
          .get();
        
        allDocsSnapshot.docs.forEach((docSnap) => {
          const report = { id: docSnap.id, ...docSnap.data() };
          if (!report.lastSyncedAt && hasMeaningfulValue(report)) {
            results.push(report);
          }
        });
        
        logger.info(`모든 문서 중 동기화되지 않은 의미있는 문서: ${results.length}개`);
      }
    } catch (error) {
      logger.error('최근 문서 가져오기 실패:', error.message);
    }
  }

  if (results.length === 0) {
    logger.warn('동기화할 문서가 없습니다. forceFullSync=true로 전체 동기화를 시도하거나, 문서를 업데이트하세요.');
  }

  return results;
};

const ensureSheet = async (sheets, spreadsheetId, sheetTitle) => {
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const existingSheets =
    spreadsheet.data.sheets?.map((sheet) => sheet.properties?.title) || [];

  if (existingSheets.includes(sheetTitle)) {
    return;
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          addSheet: {
            properties: {
              title: sheetTitle,
            },
          },
        },
      ],
    },
  });
};

// 작업일자+라인+발주번호 조합으로 고유 키 생성
const createReportKey = (report) => {
  const workDate = formatWorkDate(report.workDate);
  const line = normalizeProductionLine(report.productionLine);
  const orderNumbers = formatArray(report.orderNumbers);
  return `${workDate}|${line}|${orderNumbers}`;
};

const readExistingRows = async (sheets, spreadsheetId, sheetTitle) => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetTitle}!A:ZZ`,
    });

    const rows = response.data.values || [];
    const header = rows[0] || [];
    const dataRows = rows.slice(1);

    const map = new Map();
    
    // 헤더 확인: 첫 번째 컬럼이 '정렬ID'인지 확인
    const hasSortIdColumn = header[0] === '정렬ID';
    
    dataRows.forEach((row, index) => {
      // 작업일자+라인+발주번호로 키 생성 (공통 로직)
      let workDate, line, orderNumbersStr;
      
      if (hasSortIdColumn) {
        // 새 형식: A열이 정렬ID, B열이 작업일자, C열이 라인, D열이 발주번호
        workDate = row[1] || ''; // B열 (작업일자)
        line = row[2] || ''; // C열 (라인)
        orderNumbersStr = row[3] || ''; // D열 (발주번호)
      } else {
        // 기존 형식: 작업일자(0), 라인(1), 발주번호(2)
        workDate = row[0] || '';
        line = row[1] || '';
        orderNumbersStr = row[2] || '';
      }
      
      if (workDate && line) {
        const fullKey = `${workDate}|${line}|${orderNumbersStr}`;
        
        if (fullKey !== '||') {
          map.set(fullKey, {
            rowIndex: index + 2,
            values: row,
            updatedAt: '',
          });
          
          // 발주번호가 여러 개인 경우, 각 발주번호별로도 키 생성
          if (orderNumbersStr.includes(',')) {
            const orderNumbers = orderNumbersStr
              .split(',')
              .map(n => n.trim())
              .filter(Boolean);
            
            orderNumbers.forEach(orderNumber => {
              const singleKey = `${workDate}|${line}|${orderNumber}`;
              if (!map.has(singleKey)) {
                map.set(singleKey, {
                  rowIndex: index + 2,
                  values: row,
                  updatedAt: '',
                });
              }
            });
          }
        }
      }
    });

    return { header, map, hasSortIdColumn };
  } catch (error) {
    if (error.code === 404) {
      return { header: [], map: new Map(), hasSortIdColumn: false };
    }

    throw error;
  }
};

const writeHeader = async (sheets, spreadsheetId, sheetTitle) => {
  const endColumn = columnIndexToLetter(DAILY_REPORT_HEADERS.length - 1);
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetTitle}!A1:${endColumn}1`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [DAILY_REPORT_HEADERS],
    },
  });
};

const clearSheetData = async (sheets, spreadsheetId, sheetTitle) => {
  // 조건부 서식 규칙을 보존하기 위해 데이터만 지우고 포맷은 유지
  // values.clear는 값만 지우고 포맷(조건부 서식 포함)은 유지합니다
  try {
    // 먼저 현재 데이터 범위 확인
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetTitle}!A:ZZ`,
    });
    
    const rows = response.data.values || [];
    if (rows.length <= 1) {
      // 헤더만 있거나 데이터가 없으면 지울 것도 없음
      return;
    }
    
    // 데이터 행만 지우기 (헤더는 유지)
    // A2부터 마지막 행까지 지우기
    const lastRow = rows.length;
    const endColumn = columnIndexToLetter(DAILY_REPORT_HEADERS.length - 1);
    
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${sheetTitle}!A2:${endColumn}${lastRow}`,
    });
    
    logger.info('시트 데이터 지우기 완료 (조건부 서식 규칙 보존):', {
      sheetTitle,
      clearedRange: `A2:${endColumn}${lastRow}`,
    });
  } catch (error) {
    logger.warn('시트 데이터 지우기 실패, 전체 범위로 시도:', error.message);
    // 실패 시 기존 방식으로 시도 (하지만 포맷은 유지됨)
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${sheetTitle}!A2:ZZ`,
    });
  }
};

const sortSheetRows = async (sheets, spreadsheetId, sheetTitle) => {
  try {
    // sheetId 가져오기
    const sheetId = await getSheetId(sheets, spreadsheetId, sheetTitle);
    if (!sheetId) {
      logger.warn('sheetId를 찾을 수 없어 정렬을 건너뜁니다.');
      return;
    }

    // 현재 데이터 행 수 확인
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetTitle}!A:Z`,
    });

    const allRows = response.data.values || [];
    if (allRows.length <= 1) {
      logger.info('정렬할 데이터가 없습니다.');
      return;
    }

    const dataRows = allRows.slice(1); // 헤더 제외
    const headerRowCount = 1; // 헤더 행 수
    const dataRowCount = dataRows.length; // 데이터 행 수
    const lastDataRowIndex = headerRowCount + dataRowCount; // 1-based 마지막 데이터 행 번호
    const endColumn = columnIndexToLetter(DAILY_REPORT_HEADERS.length - 1);

    logger.info('정렬 시작:', {
      sheetTitle,
      totalRows: allRows.length,
      dataRows: dataRowCount,
      lastDataRowIndex: lastDataRowIndex,
      range: `A2:${endColumn}${lastDataRowIndex}`,
    });

    // A열(정렬ID)이 없거나 비어있는 경우 업데이트
    // 각 행의 정렬ID를 확인하고 필요시 업데이트
    const needsUpdate = dataRows.some((row, index) => {
      // A열(인덱스 0)이 없거나 비어있는 경우
      return !row[0] || row[0].trim() === '';
    });

    if (needsUpdate) {
      // A열에 정렬ID 업데이트
      const sortIdValues = dataRows.map((row) => {
        // 기존 정렬ID가 있으면 사용, 없으면 생성
        if (row[0] && row[0].trim() !== '') {
          return [row[0]];
        }

        // 리포트 객체로 변환하여 정렬ID 생성
        const report = {
          workDate: row[1] || '', // 작업일자 (B열)
          productionLine: row[2] || '', // 라인 (C열)
          orderNumbers: row[3] ? String(row[3]).split(',').map(n => n.trim()).filter(Boolean) : [], // 발주번호 (D열)
          startTime: row[17] || '', // 시작시간 (R열)
        };

        const sortId = generateSortId(report);
        return [sortId];
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetTitle}!A2:A${lastDataRowIndex}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: sortIdValues,
        },
      });
    }

    // Google Sheets API의 sortRange 사용 (A열 정렬ID로 정렬)
    // 헤더는 제외하고 데이터 행만 정렬 (startRowIndex: 1 = 2행부터, endRowIndex는 exclusive)
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            sortRange: {
              range: {
                sheetId: sheetId,
                startRowIndex: 1, // 헤더 다음 행부터 (0-based, 2행 = index 1)
                endRowIndex: lastDataRowIndex, // 마지막 데이터 행 다음 (0-based, exclusive)
                startColumnIndex: 0, // A열부터
                endColumnIndex: DAILY_REPORT_HEADERS.length, // 마지막 컬럼까지 (exclusive)
              },
              sortSpecs: [
                {
                  dimensionIndex: 0, // A열 (정렬ID)
                  sortOrder: 'ASCENDING',
                },
              ],
            },
          },
          // A열 숨기기
          {
            updateDimensionProperties: {
              range: {
                sheetId: sheetId,
                dimension: 'COLUMNS',
                startIndex: 0, // A열
                endIndex: 1, // A열만 (exclusive)
              },
              properties: {
                hiddenByUser: true,
              },
              fields: 'hiddenByUser',
            },
          },
        ],
      },
    });

    logger.info('시트 정렬 완료 (커스텀 라인 순서, 수식 보존, A열 숨김):', {
      sheetTitle,
      range: `A2:${endColumn}${lastDataRowIndex}`,
      sortedRows: dataRowCount,
      sheetId: sheetId,
      sortOrder: '작업일자 → 라인(증착1,증착2,2코팅,1코팅,내부코팅1호기,내부코팅2호기,내부코팅3호기) → 시작시간 → 발주번호',
    });
  } catch (error) {
    logger.error('시트 정렬 실패:', {
      message: error.message,
      stack: error.stack,
    });
    // 정렬 실패해도 계속 진행
  }
};

const hasStringValue = (value) =>
  typeof value === 'string' && value.trim() !== '';

const hasMeaningfulValue = (report) => {
  // 작업일자나 라인이 있으면 의미있는 데이터로 간주
  if (hasStringValue(report.workDate) || hasStringValue(report.productionLine)) {
    return true;
  }

  const stringFields = [
    report.supplier,
    report.productName,
    report.partName,
    report.specification,
    report.startTime,
    report.endTime,
    report.memo,
    report.undercoatData,
    report.topcoatData,
  ];

  if (stringFields.some(hasStringValue)) {
    return true;
  }

  // processConditions에서 하도/상도 데이터 확인
  if (report.processConditions) {
    const undercoat = report.processConditions.undercoat;
    const topcoat = report.processConditions.topcoat;
    if (
      (undercoat && (hasStringValue(undercoat.conditions) || hasStringValue(undercoat.remarks))) ||
      (topcoat && (hasStringValue(topcoat.conditions) || hasStringValue(topcoat.remarks)))
    ) {
      return true;
    }
  }

  if (Array.isArray(report.orderNumbers)) {
    const hasOrderNumber = report.orderNumbers.some((item) =>
      hasStringValue(item)
    );
    if (hasOrderNumber) {
      return true;
    }
  }

  const numericFields = [
    report.orderQuantity,
    report.inputQuantity,
    report.goodQuantity,
    report.defectQuantity,
    report.personnelCount,
    report.packagingUnit,
    report.boxCount,
    report.lineRatio,
    report.yieldRate,
    report.uph,
    report.productionPerMinute,
  ];
  if (
    numericFields.some(
      (value) => typeof value === 'number' && value !== 0 && !Number.isNaN(value)
    )
  ) {
    return true;
  }

  return false;
};

// sheetId를 가져오는 헬퍼 함수
const getSheetId = async (sheets, spreadsheetId, sheetName) => {
  try {
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    });
    
    const sheet = spreadsheet.data.sheets.find(s => s.properties.title === sheetName);
    return sheet ? sheet.properties.sheetId : null;
  } catch (error) {
    logger.warn('sheetId 가져오기 실패:', error.message);
    return null;
  }
};

const markReportsAsSynced = async (db, reportIds, syncedAtIso) => {
  if (!reportIds.length) {
    return;
  }

  const chunks = chunkArray(reportIds, BATCH_SIZE);
  for (const chunk of chunks) {
    const batch = db.batch();
    chunk.forEach((reportId) => {
      batch.update(db.collection('packaging-reports').doc(reportId), {
        needsSheetSync: false,
        lastSyncedAt: syncedAtIso,
      });
    });
    await batch.commit();
  }
};

async function runDailyReportsSync({
  spreadsheetId,
  sheetName = '생산일보',
  forceFullSync = false,
  serviceAccountEmail,
  privateKey,
}) {
  if (!spreadsheetId || typeof spreadsheetId !== 'string') {
    throw new HttpsError('invalid-argument', '스프레드시트 ID가 필요합니다.');
  }

  if (!sheetName || typeof sheetName !== 'string') {
    throw new HttpsError('invalid-argument', '시트 이름이 필요합니다.');
  }

  const { db } = initializeFirebase();
  const sheets = await getSheetsClient(serviceAccountEmail, privateKey);

  const reports = await fetchReportsForSync(db, Boolean(forceFullSync));

  logger.info('동기화 대상 문서 수:', {
    count: reports.length,
    forceFullSync: Boolean(forceFullSync),
  });

  if (reports.length === 0) {
    logger.warn('동기화할 문서가 없습니다.', {
      forceFullSync: Boolean(forceFullSync),
    });
    return {
      success: true,
      message: '동기화할 생산일보가 없습니다.',
      sheetName,
      inserted: 0,
      updated: 0,
      skipped: 0,
      totalReports: 0,
    };
  }

  await ensureSheet(sheets, spreadsheetId, sheetName);
  
  // 전체 동기화와 일반 동기화 모두 기존 행을 읽어서 비교
  const result = await readExistingRows(
    sheets,
    spreadsheetId,
    sheetName
  );
  let existingRowsMap = result.map;
  let hasSortIdColumn = result.hasSortIdColumn || false;
  
  // 헤더 확인 및 작성: 헤더가 1행에 없거나 올바르지 않으면 항상 헤더 작성
  // 1행을 명시적으로 확인
  const headerCheck = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A1:${columnIndexToLetter(DAILY_REPORT_HEADERS.length - 1)}1`,
  });
  
  const headerRow = headerCheck.data.values?.[0] || [];
  const expectedFirstHeader = DAILY_REPORT_HEADERS[0]; // '정렬ID'
  const hasValidHeader = headerRow.length > 0 && headerRow[0] === expectedFirstHeader;
  
  if (!hasValidHeader) {
    // 헤더가 1행에 없거나 올바르지 않으면 헤더 작성 (1행에 덮어쓰기)
    await writeHeader(sheets, spreadsheetId, sheetName);
    // 헤더 작성 후 다시 기존 행 읽기 (헤더 제외)
    const resultAfterHeader = await readExistingRows(
      sheets,
      spreadsheetId,
      sheetName
    );
    existingRowsMap = resultAfterHeader.map;
    hasSortIdColumn = resultAfterHeader.hasSortIdColumn || false;
  }
  
  logger.info('기존 행 읽기 완료:', {
    existingRowsCount: existingRowsMap.size,
    hasSortIdColumn: hasSortIdColumn,
    forceFullSync: Boolean(forceFullSync),
  });

  // 일반 동기화에서만 엑셀에 없는 문서를 찾기 위해 추가로 가져오기
  // 전체 동기화일 때는 이미 모든 문서를 가져왔으므로 추가 확인 불필요
  // 발주번호 분할 전에 원본 문서를 확인하되, 분할 후에도 다시 확인
  if (!forceFullSync && existingRowsMap.size > 0) {
    logger.info('엑셀에 없는 문서를 찾기 위해 추가 문서를 확인합니다.');
    const existingKeys = new Set();
    existingRowsMap.forEach((row, key) => {
      existingKeys.add(key);
    });

    // 엑셀에 있는 키 목록을 기반으로, Firestore에서 해당 문서들을 확인
    // 엑셀에 없는 문서를 찾기 위해 최근 업데이트된 문서만 확인
    try {
      // 최근 7일 이내에 업데이트된 문서만 확인 (엑셀에서 삭제되었을 가능성이 있는 문서)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      // needsSheetSync 조건 제거: 엑셀에서 삭제된 문서는 needsSheetSync가 true일 수도 있음
      // 이미 위에서 가져온 문서는 중복 체크로 제외됨
      let additionalSnapshot;
      try {
        additionalSnapshot = await db.collection('packaging-reports')
          .where('updatedAt', '>=', sevenDaysAgo)
          .orderBy('updatedAt', 'desc')
          .limit(500) // 최근 500개만 확인
          .get();
      } catch (indexError) {
        if (indexError.code === 'failed-precondition' && indexError.message.includes('index')) {
          logger.warn('updatedAt 인덱스가 없어서 정렬 없이 가져옵니다.');
          // 인덱스가 없으면 정렬 없이 가져오기
          additionalSnapshot = await db.collection('packaging-reports')
            .where('updatedAt', '>=', sevenDaysAgo)
            .limit(500)
            .get();
        } else {
          throw indexError;
        }
      }
      
      let addedCount = 0;
      let skippedCount = 0;
      
      additionalSnapshot.docs.forEach((docSnap) => {
        const report = { id: docSnap.id, ...docSnap.data() };
        // 의미있는 데이터가 있는지 확인
        if (!hasMeaningfulValue(report)) {
          skippedCount++;
          return;
        }

        // existingKeys는 createReportKey 형식이므로, 비교할 때도 createReportKey를 사용
        const reportKey = createReportKey(report);
        
        // 엑셀에 없는 문서이고, 이미 reports에 포함되지 않은 경우 추가
        const orderNumbers = Array.isArray(report.orderNumbers) 
          ? report.orderNumbers 
          : (report.orderNumbers ? String(report.orderNumbers).split(',').map(n => n.trim()).filter(Boolean) : []);
        
        // 엑셀에 있는지 확인
        let foundInExcel = existingKeys.has(reportKey);
        
        // 발주번호가 여러 개인 경우, 각 발주번호별로도 키 확인
        if (!foundInExcel && orderNumbers.length > 1) {
          for (const orderNumber of orderNumbers) {
            const singleKey = `${formatWorkDate(report.workDate)}|${normalizeProductionLine(report.productionLine)}|${orderNumber}`;
            if (existingKeys.has(singleKey)) {
              foundInExcel = true;
              break;
            }
          }
        }
        
        // 엑셀에 없고, 이미 reports에 포함되지 않은 경우 추가
        if (!foundInExcel) {
          const alreadyIncluded = reports.some(r => r.id === report.id);
          if (!alreadyIncluded) {
            reports.push(report);
            addedCount++;
          }
        } else {
          skippedCount++;
        }
      });
      
      if (addedCount > 0) {
        logger.info('엑셀에 없는 문서를 동기화 대상에 추가:', {
          addedCount,
          skippedCount,
          totalChecked: additionalSnapshot.size,
        });
      }
    } catch (error) {
      logger.warn('추가 문서 확인 중 오류:', error.message);
    }
  }

  // 리포트를 발주번호별로 분할 (로그 제거)
  
  const splitReports = [];
  const originalReportIds = new Set(); // 원본 리포트 ID 추적
  
  for (const report of reports) {
    try {
      const splits = await splitReportByOrderNumbers(db, report);
      splitReports.push(...splits);
      // 원본 리포트 ID 저장 (분할된 리포트의 originalId 또는 원본 id)
      const originalId = splits[0]?.originalId || report.id;
      originalReportIds.add(originalId);
    } catch (error) {
      logger.error('발주번호 분할 실패:', {
        reportId: report.id,
        error: error.message,
        stack: error.stack,
      });
      // 분할 실패 시 원본 리포트 그대로 사용
      splitReports.push(report);
      originalReportIds.add(report.id);
    }
  }
  
  // 발주번호별 분할 완료 (로그 제거 - 너무 많은 로그 출력 방지)

  const sortedReports = [...splitReports].sort(compareReports);

  const processedReportIds = new Set();
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const rowsToAppend = [];
  const rowsToUpdate = [];

  for (const report of sortedReports) {
    if (!hasMeaningfulValue(report)) {
      logger.warn('의미없는 데이터로 스킵:', {
        reportId: report.id,
        workDate: report.workDate,
        productionLine: report.productionLine,
        hasWorkDate: !!report.workDate,
        hasProductionLine: !!report.productionLine,
        hasSupplier: !!report.supplier,
        hasProductName: !!report.productName,
        hasOrderNumbers: Array.isArray(report.orderNumbers) && report.orderNumbers.length > 0,
        hasNumericValues: !!(report.orderQuantity || report.inputQuantity || report.goodQuantity),
      });
      skipped += 1;
      continue;
    }

    const newRow = mapReportToRow(report);
    
    // 기존 행 찾기: 작업일자+라인+발주번호로 직접 매칭 (가장 확실함)
    const key = createReportKey(report);
    let existing = existingRowsMap.get(key);
    
    // 발주번호가 여러 개인 경우, 단일 발주번호로도 시도
    if (!existing && report.orderNumbers && Array.isArray(report.orderNumbers) && report.orderNumbers.length > 0) {
      const firstOrderNumber = report.orderNumbers[0];
      const singleKey = `${formatWorkDate(report.workDate)}|${normalizeProductionLine(report.productionLine)}|${firstOrderNumber}`;
      existing = existingRowsMap.get(singleKey);
    }
    
    // 기존 행이 있으면 업데이트 (수식이 있는 컬럼은 제외)
    if (existing) {
      // 정렬ID 업데이트 (정렬용이므로 항상 최신 값으로 업데이트)
      if (hasSortIdColumn) {
        const sortId = generateSortId(report);
        const existingSortId = existing.values[0] || ''; // A열의 기존 정렬ID
        if (existingSortId !== sortId) {
          // 정렬ID 업데이트 (A열)
          rowsToUpdate.push({
            range: `${sheetName}!A${existing.rowIndex}:A${existing.rowIndex}`,
            values: [[sortId]],
          });
        }
      }
      // 수식이 있는 컬럼 인덱스: 발주처(4), 제품명(5), 부속명(6), 사양(8)
      // A열(정렬ID, 인덱스 0)은 별도로 업데이트하므로 제외
      // 이 컬럼들은 업데이트하지 않아서 수식이 보존됨
      // dataRow는 정렬ID를 제외했으므로, dataRow 기준 인덱스로 변환: 실제 컬럼 인덱스 - 1
      // 발주처(4) → dataRow[3], 제품명(5) → dataRow[4], 부속명(6) → dataRow[5], 사양(8) → dataRow[7]
      const formulaColumns = [4, 5, 6, 8]; // 실제 컬럼 인덱스
      
      // 수식이 없는 컬럼만 업데이트하기 위해 여러 범위로 나누기
      // 정렬ID(A열, 인덱스 0)는 이미 별도로 업데이트했으므로 제외
      // newRow에서 정렬ID를 제외한 배열 생성 (B열부터 시작)
      const dataRow = newRow.slice(1); // 정렬ID 제외 (B열부터)
      const updateRanges = [];
      let startCol = 0; // dataRow 기준 인덱스 (실제로는 B열부터)
      
      for (let i = 0; i < dataRow.length; i++) {
        const actualColIndex = i + 1; // 실제 컬럼 인덱스 (B열 = 1)
        if (formulaColumns.includes(actualColIndex)) {
          // 수식 컬럼 전까지 업데이트 범위 추가
          if (startCol < i) {
            // dataRow 기준 인덱스를 실제 컬럼 인덱스로 변환
            // dataRow.slice(startCol, i)는 dataRow[startCol]부터 dataRow[i-1]까지
            // dataRow[startCol]의 실제 컬럼 인덱스: startCol + 1 (B열부터)
            // dataRow[i-1]의 실제 컬럼 인덱스: (i-1) + 1 = i
            // 예: startCol=0, i=1 → dataRow.slice(0,1) = [dataRow[0]] → B열만 (범위: B:B)
            //     startCol=0, i=4 → dataRow.slice(0,4) = [dataRow[0..3]] → B~E열 (범위: B:E)
            const startActualCol = startCol + 1; // 실제 컬럼 인덱스 (B열부터, 최소 1)
            const endActualCol = i; // dataRow[i-1]의 실제 컬럼 인덱스는 i
            const startColLetter = columnIndexToLetter(startActualCol);
            const endColLetter = columnIndexToLetter(endActualCol);
            const updateValues = dataRow.slice(startCol, i);
            
            updateRanges.push({
              range: `${sheetName}!${startColLetter}${existing.rowIndex}:${endColLetter}${existing.rowIndex}`,
              values: [[...updateValues]],
            });
          }
          startCol = i + 1; // 수식 컬럼 다음부터 시작
        }
      }
      
      // 마지막 범위 추가
      if (startCol < dataRow.length) {
        // dataRow는 정렬ID를 제외했으므로, dataRow의 마지막 요소 인덱스는 dataRow.length - 1
        // 이것의 실제 컬럼 인덱스는 (dataRow.length - 1) + 1 = dataRow.length
        // newRow.length - 1 = dataRow.length이므로 동일함
        const startActualCol = startCol + 1; // 실제 컬럼 인덱스 (B열부터)
        const lastRangeValues = dataRow.slice(startCol);
        // lastRangeValues의 마지막 요소의 실제 컬럼 인덱스는 startActualCol + lastRangeValues.length - 1
        // 하지만 dataRow의 마지막 요소는 항상 S열(인덱스 18)이므로, endActualCol은 dataRow.length여야 함
        // 헤더는 19개이므로 S열까지가 맞음 (인덱스 0~18)
        const endActualCol = Math.min(startActualCol + lastRangeValues.length - 1, DAILY_REPORT_HEADERS.length - 1);
        const startColLetter = columnIndexToLetter(startActualCol);
        const endColLetter = columnIndexToLetter(endActualCol);
        
        // 헤더 길이를 초과하지 않도록 값도 제한
        const safeLastRangeValues = lastRangeValues.slice(0, endActualCol - startActualCol + 1);
        
        updateRanges.push({
          range: `${sheetName}!${startColLetter}${existing.rowIndex}:${endColLetter}${existing.rowIndex}`,
          values: [[...safeLastRangeValues]],
        });
      }
      
      // 여러 범위로 나누어 업데이트 (수식 컬럼 제외)
      rowsToUpdate.push(...updateRanges);
      updated += 1;
      
      // 기존 행 업데이트 (수식 컬럼 제외)
    } else {
      // 엑셀에 없는 행이므로 새로 추가
      rowsToAppend.push(newRow);
      inserted += 1;
      
      const key = hasSortIdColumn 
        ? generateSortId(report)
        : createReportKey(report);
      
      logger.info('엑셀에 없는 행 추가 (삭제된 행 복구 또는 신규):', {
        reportId: report.id,
        originalId: report.originalId,
        workDate: report.workDate,
        productionLine: report.productionLine,
        orderNumbers: report.orderNumbers,
        key: key,
        hasSortIdColumn: hasSortIdColumn,
      });
    }

    // 원본 리포트 ID를 processedReportIds에 추가 (동기화 플래그 설정용)
    const originalId = report.originalId || report.id;
    processedReportIds.add(originalId);
  }

    // rowsToAppend 후에 수식 복사 추가
    let appendResponse = null; // 수식 복사 로직에서 사용하기 위해 변수 선언
    if (rowsToAppend.length) {
      // 근본적인 해결: append 대신 정확한 행 번호를 계산하여 batchUpdate + update 사용
      const endColumn = columnIndexToLetter(DAILY_REPORT_HEADERS.length - 1);
      const expectedLength = DAILY_REPORT_HEADERS.length;
      
      // append 전에 각 행의 길이를 정확히 헤더 길이로 제한 (근본 해결)
      const safeRowsToAppend = rowsToAppend.map(row => {
        // 정확히 expectedLength로 제한 (초과하면 자르기, 부족하면 빈 값으로 채우기)
        const safeRow = Array(expectedLength).fill('');
        if (row && Array.isArray(row)) {
          for (let i = 0; i < Math.min(row.length, expectedLength); i++) {
            safeRow[i] = row[i] !== undefined && row[i] !== null ? row[i] : '';
          }
        }
        
        if (row && row.length > expectedLength) {
          logger.warn('행 길이 초과, 자동 조정:', {
            originalLength: row.length,
            expectedLength,
            firstFewValues: row.slice(0, 5),
            lastFewValues: row.slice(-3),
          });
        }
        
        return safeRow;
      });
      
      // 근본적인 해결: existingRowsMap에서 실제 마지막 데이터 행 번호 찾기 (가장 정확함)
      let lastDataRow1Based = 1; // 헤더만 있으면 1
      if (existingRowsMap.size > 0) {
        // existingRowsMap의 각 행에서 가장 큰 rowIndex 찾기
        let maxRowIndex = 0;
        existingRowsMap.forEach((rowData) => {
          if (rowData.rowIndex > maxRowIndex) {
            maxRowIndex = rowData.rowIndex;
          }
        });
        lastDataRow1Based = maxRowIndex; // rowIndex는 이미 1-based
      }
      
      // insertDimension은 0-based이므로 변환
      const lastDataRow0Based = lastDataRow1Based - 1; // 0-based: 마지막 데이터 행 인덱스
      const startRow1Based = lastDataRow1Based + 1; // 1-based: 새 행 시작 위치
      const endRow1Based = startRow1Based + safeRowsToAppend.length - 1; // 1-based: 새 행 끝 위치
      
      // startIndex는 0-based이고, 마지막 데이터 행 다음에 삽입해야 하므로 lastDataRow0Based + 1
      let insertStartIndex = lastDataRow0Based + 1; // 0-based: 마지막 데이터 행 다음
      let insertEndIndex = insertStartIndex + safeRowsToAppend.length; // 0-based: exclusive
      
      // 근본적인 해결: batchUpdate로 빈 행을 먼저 삽입
      const sheetId = await getSheetId(sheets, spreadsheetId, sheetName);
      if (sheetId !== null) {
        // 그리드 크기 확인
        const spreadsheet = await sheets.spreadsheets.get({
          spreadsheetId,
        });
        const sheet = spreadsheet.data.sheets.find(s => s.properties.sheetId === sheetId);
        const gridRowCount = sheet?.properties?.gridProperties?.rowCount || 1000; // 기본값 1000
        
        // 근본적인 해결: insertDimension 제거하고 values.update만 사용
        // insertDimension이 예상보다 더 많은 행을 삽입하므로, 직접 update 사용
        // 그리드가 부족하면 먼저 확장
        if (insertStartIndex >= gridRowCount) {
          // 그리드를 정확히 필요한 만큼만 확장
          const neededRowCount = insertEndIndex; // insertEndIndex는 exclusive이므로 이것만큼 확장
          logger.warn('insertStartIndex가 그리드 크기보다 큼, 그리드 확장:', {
            insertStartIndex,
            gridRowCount,
            lastDataRow1Based,
            neededRowCount,
            rowsToInsert: safeRowsToAppend.length,
          });
          
          // 그리드 확장 (정확히 필요한 만큼만)
          await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
              requests: [{
                updateSheetProperties: {
                  properties: {
                    sheetId: sheetId,
                    gridProperties: {
                      rowCount: neededRowCount,
                    },
                  },
                  fields: 'gridProperties.rowCount',
                },
              }],
            },
          });
        }
        
        // 근본적인 해결: insertDimension 제거, values.update만 사용 (빈 행 자동 생성)
        // Google Sheets는 존재하지 않는 행에 update하면 자동으로 행이 생성됨
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${sheetName}!A${startRow1Based}:${endColumn}${endRow1Based}`,
          valueInputOption: 'RAW',
          requestBody: {
            values: safeRowsToAppend,
          },
        });
        
        // appendResponse를 수식 복사 로직에서 사용하기 위해 생성
        appendResponse = {
          data: {
            updates: {
              updatedRange: `${sheetName}!A${startRow1Based}:${endColumn}${endRow1Based}`,
            },
          },
        };
      } else {
        // sheetId가 null인 경우: 에러 발생 (append 제거로 인해 insertDimension 사용 불가)
        throw new Error(`시트 ID를 찾을 수 없습니다: ${sheetName}`);
      }
      
      logger.info('근본적 해결: 새 행 추가 완료:', {
        startRow: startRow1Based,
        endRow: endRow1Based,
        rowsCount: safeRowsToAppend.length,
        range: appendResponse?.data?.updates?.updatedRange || `A${startRow1Based}:${endColumn}${endRow1Based}`,
        lastDataRow1Based,
        insertStartIndex,
        insertEndIndex,
        method: appendResponse ? (appendResponse.data?.updates?.updatedRange ? 'append' : 'insertDimension+update') : 'unknown',
      });
      
      // 추가된 행의 범위 확인 (수식 복사용)
      // Google Sheets API append 응답 구조: { data: { updates: { updatedRange: "...", ... } } }
      if (appendResponse) {
      const updates = appendResponse.data?.updates;
      const updatedRangeFromUpdates = updates?.updatedRange;
      
      // updatedRange가 없으면 다른 경로 시도
      const finalUpdatedRange = updatedRangeFromUpdates || appendResponse.data?.updatedRange || appendResponse.updatedRange;
      
      if (finalUpdatedRange) {
      // 범위에서 시작 행과 끝 행 추출
      // 형식: '생산일보'!A1803:R1810 또는 A1803:R1810
      // 숫자 부분만 추출: A1803:R1810 -> 1803, 1810
      // 정규식: 컬럼 이름 + 숫자:컬럼 이름 + 숫자 패턴 찾기
      // 예: A1803:R1810 -> 1803, 1810
      const rangeMatch = finalUpdatedRange.match(/[A-Z]+(\d+):[A-Z]+(\d+)/);
      
      if (rangeMatch) {
        const startRow = parseInt(rangeMatch[1]);
        const endRow = parseInt(rangeMatch[2]);
        
        // sheetId 한 번만 가져오기
        const sheetId = await getSheetId(sheets, spreadsheetId, sheetName);
        
        if (sheetId && startRow > 2) { // 헤더 다음 행부터
          // 수식이 있는 컬럼: 발주처(E), 제품명(F), 부속명(G), 사양(I)
          // A열(정렬ID)이 추가되어 컬럼이 하나씩 밀림
          const formulaColumns = ['E', 'F', 'G', 'I'];
          const sourceRow = startRow - 1; // 새 행 바로 위 행
          
          if (sourceRow >= 2) {
            try {
              // 1단계: 위쪽 행의 수식 읽기
              const sourceRange = `${sheetName}!${formulaColumns[0]}${sourceRow}:${formulaColumns[formulaColumns.length - 1]}${sourceRow}`;
              
              const sourceResponse = await sheets.spreadsheets.get({
                spreadsheetId,
                ranges: [sourceRange],
                includeGridData: true,
              });
              
              const sourceSheet = sourceResponse.data.sheets?.[0];
              const sourceGridData = sourceSheet?.data?.[0];
              const sourceRowData = sourceGridData?.rowData?.[0];
              
              if (!sourceRowData || !sourceRowData.values) {
                logger.warn('소스 행 데이터를 찾을 수 없습니다:', { 
                  sourceRow, 
                  sourceRange,
                });
                return;
              }
              
              // 2단계: 각 새 행에 수식 복사 (copyPaste 사용)
              const copyPasteRequests = [];
              
              // sourceRange의 시작 컬럼 인덱스 계산 (E=4)
              const startColIndex = formulaColumns[0].charCodeAt(0) - 65;
              
              for (let targetRow = startRow; targetRow <= endRow; targetRow++) {
                formulaColumns.forEach((col) => {
                  const colIndex = col.charCodeAt(0) - 65; // E=4, F=5, G=6, I=8
                  // sourceRange에서의 실제 인덱스 계산 (E부터 시작하므로 상대 인덱스)
                  const sourceCellIndex = colIndex - startColIndex;
                  const sourceCell = sourceRowData.values[sourceCellIndex];
                  
                  // 수식이 있는 경우만 복사
                  if (sourceCell?.userEnteredValue?.formulaValue) {
                    copyPasteRequests.push({
                      copyPaste: {
                        source: {
                          sheetId: sheetId,
                          startRowIndex: sourceRow - 1, // 0-based: 소스 행
                          endRowIndex: sourceRow, // 0-based: exclusive
                          startColumnIndex: colIndex,
                          endColumnIndex: colIndex + 1, // exclusive
                        },
                        destination: {
                          sheetId: sheetId,
                          startRowIndex: targetRow - 1, // 0-based: 대상 행
                          endRowIndex: targetRow, // 0-based: exclusive
                          startColumnIndex: colIndex,
                          endColumnIndex: colIndex + 1, // exclusive
                        },
                        pasteType: 'PASTE_FORMULA', // 수식만 복사
                        pasteOrientation: 'NORMAL',
                      },
                    });
                  }
                });
              }
              
              // 3단계: 배치로 실행
              if (copyPasteRequests.length > 0) {
                const batchSize = 100;
                for (let i = 0; i < copyPasteRequests.length; i += batchSize) {
                  const batch = copyPasteRequests.slice(i, i + batchSize);
                  
                  try {
                    await sheets.spreadsheets.batchUpdate({
                      spreadsheetId,
                      requestBody: {
                        requests: batch,
                      },
                    });
                  } catch (batchError) {
                    logger.error('수식 복사 배치 실패:', {
                      message: batchError.message,
                      stack: batchError.stack,
                      batchIndex: i,
                      batchSize: batch.length,
                    });
                    throw batchError;
                  }
                }
              } else {
                logger.warn('복사할 수식이 없습니다:', { 
                  sourceRow, 
                  sourceRange,
                  formulaColumns,
                });
              }
            } catch (error) {
              logger.error('수식 복사 실패:', {
                message: error.message,
                stack: error.stack,
                sourceRow: sourceRow,
                targetRange: `${startRow}:${endRow}`,
                sheetId: sheetId,
              });
            }
          } else {
            logger.warn('수식 복사 스킵: sourceRow 조건 불만족', {
              sourceRow,
              sourceRowCondition: sourceRow >= 2,
            });
          }
        } else {
          logger.warn('수식 복사 스킵:', {
            reason: !sheetId ? 'sheetId를 찾을 수 없음' : 'startRow가 2 이하',
            sheetId,
            startRow,
            endRow,
          });
        }
      } else {
        logger.warn('수식 복사 스킵: rangeMatch를 찾을 수 없음', {
          finalUpdatedRange,
          finalUpdatedRangeType: typeof finalUpdatedRange,
          finalUpdatedRangeLength: finalUpdatedRange ? finalUpdatedRange.length : 0,
          testMatch: finalUpdatedRange ? finalUpdatedRange.match(/(\d+):(\d+)/) : null,
        });
      }
    } else {
      const updates = appendResponse.data?.updates;
      logger.warn('수식 복사 스킵: finalUpdatedRange를 찾을 수 없음', {
        finalUpdatedRange: null,
        hasUpdates: !!updates,
        updatesKeys: updates ? Object.keys(updates) : [],
        appendResponseDataKeys: appendResponse.data ? Object.keys(appendResponse.data) : [],
      });
    }
    } else {
      logger.warn('수식 복사 스킵: appendResponse가 없음 (rowsToAppend가 비어있음)');
    }
  }
  
  if (rowsToAppend.length === 0) {
    logger.info('수식 복사 스킵: 새 행이 없음 (rowsToAppend.length = 0)', {
      rowsToAppend: rowsToAppend.length,
      rowsToUpdate: rowsToUpdate.length,
    });
  }

  // 기존 행 업데이트 (수식 컬럼 제외)
  if (rowsToUpdate.length) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: 'RAW',
        data: rowsToUpdate,
      },
    });
  }

  // 삭제된 문서 처리: Google Sheets에는 있지만 Firestore에는 없는 행 삭제
  // 일반 동기화 모드에서는 삭제하지 않음 (전체 동기화 모드에서만 삭제)
  let deleted = 0;
  const rowsToDeleteSet = new Set(); // 중복 제거를 위한 Set
  
  // 전체 동기화 모드에서만 삭제 로직 실행
  if (forceFullSync) {
    // Firestore에서 가져온 모든 문서의 키를 Set으로 수집
    const firestoreKeys = new Set();
    for (const report of sortedReports) {
      if (hasMeaningfulValue(report)) {
        const key = createReportKey(report);
        firestoreKeys.add(key);
        
        // 발주번호가 여러 개인 경우, 각 발주번호별로도 키 추가
        if (report.orderNumbers && Array.isArray(report.orderNumbers) && report.orderNumbers.length > 0) {
          report.orderNumbers.forEach(orderNumber => {
            const singleKey = `${formatWorkDate(report.workDate)}|${normalizeProductionLine(report.productionLine)}|${orderNumber}`;
            firestoreKeys.add(singleKey);
          });
        }
      }
    }
    
    // Google Sheets에는 있지만 Firestore에는 없는 행 찾기
    for (const [key, existing] of existingRowsMap.entries()) {
      if (!firestoreKeys.has(key)) {
        rowsToDeleteSet.add(existing.rowIndex);
        deleted += 1;
      }
    }
    
    // 삭제할 행이 있으면 역순으로 정렬하여 아래부터 삭제 (행 번호가 변경되지 않도록)
    const rowsToDelete = Array.from(rowsToDeleteSet);
    if (rowsToDelete.length > 0) {
      rowsToDelete.sort((a, b) => b - a); // 역순 정렬
      
      const sheetId = await getSheetId(sheets, spreadsheetId, sheetName);
      if (sheetId) {
        const deleteRequests = rowsToDelete.map(rowIndex => ({
          deleteDimension: {
            range: {
              sheetId: sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex - 1, // 0-based index (헤더 제외)
              endIndex: rowIndex, // endIndex는 exclusive
            },
          },
        }));
        
        // 배치로 삭제 (한 번에 최대 100개까지)
        const batchSize = 100;
        for (let i = 0; i < deleteRequests.length; i += batchSize) {
          const batch = deleteRequests.slice(i, i + batchSize);
          await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
              requests: batch,
            },
          });
        }
        
        logger.info('삭제된 문서에 해당하는 행 삭제 완료:', {
          deletedCount: rowsToDelete.length,
          sheetName,
        });
      }
    }
  } else {
    logger.info('일반 동기화 모드: 삭제 로직 건너뜀 (전체 동기화 모드에서만 삭제)');
  }
  
  // rowsToDelete 변수를 정렬 로직에서 사용하기 위해 정의
  const rowsToDelete = Array.from(rowsToDeleteSet);

  // sortRange API를 사용하여 수식 보존하면서 정렬
  if (rowsToAppend.length || rowsToUpdate.length || rowsToDelete.length > 0) {
    await sortSheetRows(sheets, spreadsheetId, sheetName);
  }

  const nowIso = new Date().toISOString();
  await markReportsAsSynced(db, Array.from(processedReportIds), nowIso);

  return {
    success: true,
    sheetName,
    inserted,
    updated,
    skipped,
    deleted,
    totalReports: reports.length,
    forceFullSync: Boolean(forceFullSync),
  };
}

module.exports = {
  runDailyReportsSync,
};

