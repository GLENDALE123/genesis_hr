/**
 * Firebase Storage 트리거 - 이미지 업로드 시 썸네일 자동 생성
 * 모든 이미지 파일에 대해 썸네일을 생성합니다 (예외 폴더 제외)
 */

const { onObjectFinalized } = require('firebase-functions/v2/storage');
const admin = require('firebase-admin');
const sharp = require('sharp');
const path = require('path');
const os = require('os');
const fs = require('fs');

// 제외할 폴더 목록 (썸네일 생성하지 않음)
const EXCLUDED_FOLDERS = [
  'electron-releases',
  'mobile-releases',
  'public'
];

// 썸네일 설정
const THUMBNAIL_CONFIG = {
  width: 300,
  height: 300,
  quality: 80,
  format: 'webp'
};

/**
 * 썸네일 생성 트리거
 * 모든 이미지 파일에 대해 자동으로 썸네일을 생성합니다
 */
exports.generateThumbnail = onObjectFinalized({
  region: 'asia-northeast3',
  memory: '512MiB',
  timeoutSeconds: 540
}, async (event) => {
  const object = event.data;
  const fileBucket = object.bucket;
  const filePath = object.name;
  const contentType = object.contentType;
  
  // 이미지 파일인지 확인
  if (!contentType || !contentType.startsWith('image/')) {
    return null;
  }
  
  // 이미 썸네일 파일인지 확인 (무한 루프 방지)
  if (isThumbnailFile(filePath)) {
    return null;
  }
  
  // 제외 폴더 확인
  if (isExcludedFolder(filePath)) {
    return null;
  }
  
  const startTime = Date.now();
  let errorDetails = null;
  
  try {
    // Storage에서 파일 다운로드
    const bucket = admin.storage().bucket(fileBucket);
    const fileName = path.basename(filePath);
    const tempFilePath = path.join(os.tmpdir(), `thumb_${Date.now()}_${fileName}`);
    
    await bucket.file(filePath).download({ destination: tempFilePath });
    
    // 썸네일 생성
    const thumbnailPath = getThumbnailPath(filePath);
    const tempThumbnailPath = path.join(os.tmpdir(), `thumb_${Date.now()}_thumb.webp`);
    
    await sharp(tempFilePath)
      .resize(THUMBNAIL_CONFIG.width, THUMBNAIL_CONFIG.height, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality: THUMBNAIL_CONFIG.quality })
      .toFile(tempThumbnailPath);
    
    // Storage에 썸네일 업로드
    await bucket.upload(tempThumbnailPath, {
      destination: thumbnailPath,
      metadata: {
        contentType: 'image/webp',
        metadata: {
          originalImage: filePath,
          generatedAt: new Date().toISOString()
        }
      }
    });
    
    // 임시 파일 정리
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
    if (fs.existsSync(tempThumbnailPath)) {
      fs.unlinkSync(tempThumbnailPath);
    }
    
    const duration = Date.now() - startTime;
    console.log(`✅ 썸네일 생성 완료: ${filePath} (${duration}ms)`);
    
    return {
      success: true,
      originalPath: filePath,
      thumbnailPath: thumbnailPath,
      duration: duration
    };
    
  } catch (error) {
    errorDetails = {
      message: error.message,
      stack: error.stack,
      code: error.code || 'UNKNOWN'
    };
    
    const duration = Date.now() - startTime;
    console.error(`❌ 썸네일 생성 실패: ${filePath}`, {
      error: errorDetails,
      duration: duration
    });
    
    // 에러 통계 로깅
    logErrorStatistics(filePath, errorDetails, duration);
    
    return null;
  }
});

/**
 * 썸네일 파일인지 확인
 */
function isThumbnailFile(filePath) {
  const fileName = path.basename(filePath);
  return fileName.includes('_thumb.webp') || fileName.endsWith('_thumb.webp');
}

/**
 * 제외 폴더인지 확인
 */
function isExcludedFolder(filePath) {
  return EXCLUDED_FOLDERS.some(folder => filePath.startsWith(folder + '/'));
}

/**
 * 썸네일 경로 생성
 */
function getThumbnailPath(originalPath) {
  const pathParts = originalPath.split('/');
  const fileName = pathParts[pathParts.length - 1];
  const fileNameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
  const thumbnailFileName = `${fileNameWithoutExt}_thumb.webp`;
  
  pathParts[pathParts.length - 1] = thumbnailFileName;
  return pathParts.join('/');
}

/**
 * 에러 통계 로깅
 */
function logErrorStatistics(filePath, errorDetails, duration) {
  // 에러 통계를 로깅 (향후 모니터링 시스템에 전송 가능)
  const errorLog = {
    timestamp: new Date().toISOString(),
    filePath: filePath,
    error: errorDetails,
    duration: duration,
    type: 'thumbnail_generation_error'
  };
  
  console.error('[ERROR_STATISTICS]', JSON.stringify(errorLog));
}

