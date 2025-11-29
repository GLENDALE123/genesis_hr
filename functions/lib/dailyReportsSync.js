const { HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions/v2');
const { google } = require('googleapis');

const { chunkArray, initializeFirebase } = require('./utils');

const DAILY_REPORT_HEADERS = [
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

const compareReports = (a, b) => {
  const dateA = a.workDate || '';
  const dateB = b.workDate || '';
  const timeA = dateA ? new Date(dateA).getTime() : 0;
  const timeB = dateB ? new Date(dateB).getTime() : 0;

  if (timeA !== timeB) {
    return timeA - timeB;
  }

  const lineA = normalizeProductionLine(a.productionLine);
  const lineB = normalizeProductionLine(b.productionLine);
  return lineA.localeCompare(lineB);
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
  
  logger.info('발주번호 분할 시작:', {
    reportId: report.id,
    orderNumbers: orderNumbers,
    orderCount: orderNumbers.length,
  });
  
  // 발주번호별 발주수량 조회
  const orderQuantities = await getOrderQuantities(db, orderNumbers);
  
  // 총 발주수량 계산
  const totalOrderQuantity = Object.values(orderQuantities).reduce((sum, qty) => sum + qty, 0);
  
  // 발주수량이 모두 0이면 균등 분배
  const useEqualDistribution = totalOrderQuantity === 0;
  
  if (useEqualDistribution) {
    logger.info('발주수량이 없어서 균등 분배 사용:', {
      reportId: report.id,
      orderCount: orderNumbers.length,
    });
  } else {
    logger.info('발주수량 비율 기반 분배 사용:', {
      reportId: report.id,
      orderQuantities: orderQuantities,
      totalOrderQuantity: totalOrderQuantity,
    });
  }
  
  const splitReports = [];
  const totalInput = report.inputQuantity || 0;
  const totalGood = report.goodQuantity || 0;
  const totalDefect = report.defectQuantity || 0;
  
  let remainingInput = totalInput;
  let remainingGood = totalGood;
  let remainingDefect = totalDefect;
  
  for (let i = 0; i < orderNumbers.length; i++) {
    const orderNumber = orderNumbers[i];
    const orderQty = orderQuantities[orderNumber] || 0;
    
    // 마지막 발주번호면 나머지 모두 할당
    const isLast = i === orderNumbers.length - 1;
    
    let inputQty, goodQty, defectQty;
    
    if (useEqualDistribution) {
      // 균등 분배
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
      // 발주수량 비율 기반 분배
      const ratio = orderQty / totalOrderQuantity;
      
      if (isLast) {
        inputQty = remainingInput;
        goodQty = remainingGood;
        defectQty = remainingDefect;
      } else {
        inputQty = Math.round(totalInput * ratio);
        goodQty = Math.round(totalGood * ratio);
        defectQty = Math.round(totalDefect * ratio);
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
    
    logger.info('발주번호 분할 완료:', {
      reportId: report.id,
      orderNumber: orderNumber,
      orderQuantity: orderQty,
      inputQuantity: inputQty,
      goodQuantity: goodQty,
      defectQuantity: defectQty,
      ratio: useEqualDistribution ? '균등' : `${((orderQty / totalOrderQuantity) * 100).toFixed(2)}%`,
    });
  }
  
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

  // 디버깅: 하도/상도 데이터 확인
  if (undercoatData || topcoatData || report.processConditions) {
    logger.info('하도/상도 데이터 추출:', {
      reportId: report.id,
      hasProcessConditions: !!report.processConditions,
      undercoatFromProcessConditions: report.processConditions?.undercoat?.conditions || '',
      topcoatFromProcessConditions: report.processConditions?.topcoat?.conditions || '',
      undercoatFromDirect: report.undercoatData || '',
      topcoatFromDirect: report.topcoatData || '',
      finalUndercoat: undercoatData,
      finalTopcoat: topcoatData,
    });
  }

  return [
    report.workDate || '',
    normalizeProductionLine(report.productionLine),
    formatArray(report.orderNumbers),
    report.supplier || '',
    report.productName || '',
    report.partName || '',
    formatNumber(report.orderQuantity),
    report.specification || '',
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
  const workDate = report.workDate || '';
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
    
    // 헤더 확인: 첫 번째 컬럼이 'ID'인지 확인
    const hasIdColumn = header[0] === 'ID';
    
    dataRows.forEach((row, index) => {
      if (hasIdColumn) {
        // 새 형식: 첫 번째 컬럼이 ID
        const docId = row[0];
        if (docId) {
          map.set(docId, {
            rowIndex: index + 2,
            values: row,
            updatedAt: '',
          });
        }
      } else {
        // 기존 형식: 작업일자(0), 라인(1), 발주번호(2) 조합으로 키 생성
        const workDate = row[0] || '';
        const line = row[1] || '';
        const orderNumbers = row[2] || '';
        const key = `${workDate}|${line}|${orderNumbers}`;
        
        if (key !== '||') { // 빈 행 제외
          map.set(key, {
            rowIndex: index + 2,
            values: row,
            updatedAt: '',
          });
        }
      }
    });

    return { header, map, hasIdColumn };
  } catch (error) {
    if (error.code === 404) {
      return { header: [], map: new Map(), hasIdColumn: false };
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
  const endColumn = columnIndexToLetter(DAILY_REPORT_HEADERS.length - 1);
  const range = `${sheetTitle}!A2:${endColumn}`;

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  const rows = response.data.values || [];
  if (!rows.length) {
    return;
  }

  rows.sort((a, b) => {
    const dateA = a[0] || '';
    const dateB = b[0] || '';
    const timeA = dateA ? new Date(dateA).getTime() : 0;
    const timeB = dateB ? new Date(dateB).getTime() : 0;

    if (timeA !== timeB) {
      return timeA - timeB;
    }

    const lineA = a[1] || '';
    const lineB = b[1] || '';
    return lineA.localeCompare(lineB);
  });

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range,
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetTitle}!A2`,
    valueInputOption: 'RAW',
    requestBody: {
      values: rows,
    },
  });
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
  let existingRowsMap = new Map();
  let hasIdColumn = false;
  let shouldWriteHeader = true;
  
  if (forceFullSync) {
    // 전체 동기화: 데이터만 지우고 조건부 서식 규칙은 보존
    await clearSheetData(sheets, spreadsheetId, sheetName);
    // 헤더는 이미 있으므로 다시 쓰지 않음 (조건부 서식 규칙 보존)
    shouldWriteHeader = false;
  } else {
    const result = await readExistingRows(
      sheets,
      spreadsheetId,
      sheetName
    );
    existingRowsMap = result.map;
    hasIdColumn = result.hasIdColumn || false;
    // 기존 헤더가 있으면 다시 쓰지 않음
    if (result.header && result.header.length > 0) {
      shouldWriteHeader = false;
    }
  }
  
  // 헤더가 없거나 일반 동기화에서 헤더가 없을 때만 헤더 작성
  if (shouldWriteHeader) {
    await writeHeader(sheets, spreadsheetId, sheetName);
  }

  // 일반 동기화에서 엑셀에 없는 문서를 찾기 위해 추가로 가져오기
  if (!forceFullSync && existingRowsMap.size > 0) {
    logger.info('엑셀에 없는 문서를 찾기 위해 추가 문서를 확인합니다.');
    const existingKeys = new Set();
    existingRowsMap.forEach((row, key) => {
      existingKeys.add(key);
    });

    // 엑셀에 있는 키 목록을 기반으로, Firestore에서 해당 문서들을 확인
    // 엑셀에 없는 문서를 찾기 위해 최근 문서들을 추가로 확인
    try {
      const additionalSnapshot = await db.collection('packaging-reports')
        .limit(1000)
        .get();
      
      additionalSnapshot.docs.forEach((docSnap) => {
        const report = { id: docSnap.id, ...docSnap.data() };
        // 의미있는 데이터가 있는지 확인
        if (!hasMeaningfulValue(report)) {
          return;
        }

        // 엑셀에 있는지 확인
        const reportKey = hasIdColumn 
          ? `id:${report.id}` 
          : createReportKey(report);
        
        // 엑셀에 없는 문서이고, 이미 reports에 포함되지 않은 경우 추가
        if (!existingKeys.has(reportKey)) {
          const alreadyIncluded = reports.some(r => r.id === report.id);
          if (!alreadyIncluded) {
            reports.push(report);
            logger.info('엑셀에 없는 문서를 동기화 대상에 추가:', {
              reportId: report.id,
              workDate: report.workDate,
              productionLine: report.productionLine,
              key: reportKey,
            });
          }
        }
      });
    } catch (error) {
      logger.warn('추가 문서 확인 중 오류:', error.message);
    }
  }

  // 리포트를 발주번호별로 분할
  logger.info('발주번호별 분할 시작:', {
    totalReports: reports.length,
  });
  
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
  
  logger.info('발주번호별 분할 완료:', {
    originalReports: reports.length,
    splitReports: splitReports.length,
    splitRatio: splitReports.length / reports.length,
  });

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
    
    // 기존 행 찾기: ID 컬럼이 있으면 ID로, 없으면 작업일자+라인+발주번호 조합으로
    let existing = null;
    if (hasIdColumn) {
      existing = existingRowsMap.get(report.id);
    } else {
      const key = createReportKey(report);
      existing = existingRowsMap.get(key);
    }
    
    // 기존 행이 있고, forceFullSync가 아니면 업데이트
    if (existing) {
      const endColumn = columnIndexToLetter(newRow.length - 1);
      rowsToUpdate.push({
        range: `${sheetName}!A${existing.rowIndex}:${endColumn}${existing.rowIndex}`,
        values: [newRow],
      });
      updated += 1;
    } else {
      rowsToAppend.push(newRow);
      inserted += 1;
    }

    // 원본 리포트 ID를 processedReportIds에 추가 (동기화 플래그 설정용)
    const originalId = report.originalId || report.id;
    processedReportIds.add(originalId);
  }

  if (rowsToAppend.length) {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:A`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: rowsToAppend,
      },
    });
  }

  if (rowsToUpdate.length) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: 'RAW',
        data: rowsToUpdate,
      },
    });
  }

  if (rowsToAppend.length || rowsToUpdate.length) {
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
    totalReports: reports.length,
    forceFullSync: Boolean(forceFullSync),
  };
}

module.exports = {
  runDailyReportsSync,
};

