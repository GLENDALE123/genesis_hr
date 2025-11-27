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
  const direct =
    type === 'undercoat' ? report.undercoatData : report.topcoatData;
  if (typeof direct === 'string' && direct.trim() !== '') {
    return direct;
  }

  const conditions = report.processConditions?.[type];
  if (!conditions) {
    return '';
  }

  return (
    conditions.conditions ||
    conditions.remarks ||
    ''
  );
};

const mapReportToRow = (report) => {
  const lineRatio = report.lineRatio || report.yieldRate || '';
  const hourlyProduction =
    formatNumber(
      report.uph !== undefined ? report.uph : report.productionPerMinute
    ) || '';

  return [
    report.workDate || '',
    normalizeProductionLine(report.productionLine),
    formatArray(report.orderNumbers),
    report.supplier || '',
    report.productName || '',
    report.partName || '',
    formatNumber(report.orderQuantity),
    report.specification || '',
    getCoatingData(report, 'undercoat'),
    getCoatingData(report, 'topcoat'),
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
    let lastDoc = null;
    while (true) {
      let queryRef = db.collection('packaging-reports')
        .orderBy('workDate')
        .limit(BATCH_SIZE);

      if (lastDoc) {
        queryRef = queryRef.startAfter(lastDoc);
      }

      const snapshot = await queryRef.get();
      if (snapshot.empty) {
        break;
      }

      snapshot.docs.forEach((docSnap) => {
        const report = { id: docSnap.id, ...docSnap.data() };
        results.push(report);
      });

      lastDoc = snapshot.docs[snapshot.docs.length - 1];
      if (snapshot.size < BATCH_SIZE) {
        break;
      }
    }

    return results;
  }

  let lastDoc = null;
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
      break;
    }

    snapshot.docs.forEach((docSnap) => {
      const report = { id: docSnap.id, ...docSnap.data() };
      results.push(report);
    });

    lastDoc = snapshot.docs[snapshot.docs.length - 1];
    if (snapshot.size < BATCH_SIZE) {
      break;
    }
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
    dataRows.forEach((row, index) => {
      const docId = row[0];
      if (docId) {
        map.set(docId, {
          rowIndex: index + 2,
          values: row,
          updatedAt: row[1] || '',
        });
      }
    });

    return { header, map };
  } catch (error) {
    if (error.code === 404) {
      return { header: [], map: new Map() };
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
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${sheetTitle}!A2:ZZ`,
  });
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
  const stringFields = [
    report.workDate,
    report.productionLine,
    report.supplier,
    report.productName,
    report.partName,
    report.specification,
    report.startTime,
    report.endTime,
    report.memo,
  ];

  if (stringFields.some(hasStringValue)) {
    return true;
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

  if (reports.length === 0) {
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
  if (forceFullSync) {
    await clearSheetData(sheets, spreadsheetId, sheetName);
  } else {
    const { map } = await readExistingRows(
      sheets,
      spreadsheetId,
      sheetName
    );
    existingRowsMap = map;
  }
  await writeHeader(sheets, spreadsheetId, sheetName);

  const sortedReports = [...reports].sort(compareReports);

  const processedReportIds = new Set();
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const rowsToAppend = [];
  const rowsToUpdate = [];

  for (const report of sortedReports) {
    if (!hasMeaningfulValue(report)) {
      skipped += 1;
      continue;
    }

    const newRow = mapReportToRow(report);
    const existing = existingRowsMap.get(report.id);
    const normalizedUpdatedAt = normalizeTimestamp(
      report.updatedAt || report.createdAt
    );

    if (existing) {
      if (!forceFullSync && existing.updatedAt === normalizedUpdatedAt) {
        skipped += 1;
        continue;
      }

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

    processedReportIds.add(report.id);
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

