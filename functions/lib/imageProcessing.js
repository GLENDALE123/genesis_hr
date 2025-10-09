const { onObjectFinalized } = require('firebase-functions/v2/storage');
const { onCall } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const sharp = require('sharp');
const path = require('path');
const os = require('os');
const fs = require('fs');

// 이미지 처리 설정
const IMAGE_CONFIGS = {
  thumbnail: { width: 150, height: 150, quality: 80 },
  small: { width: 300, height: 300, quality: 85 },
  medium: { width: 600, height: 600, quality: 90 },
  large: { width: 1200, height: 1200, quality: 95 },
  original: { quality: 95 }
};

const SUPPORTED_FORMATS = ['jpeg', 'webp', 'png'];
const SUPPORTED_SIZES = Object.keys(IMAGE_CONFIGS);

/**
 * Firebase Storage 트리거 - 이미지 업로드 시 자동 처리
 */
exports.processImage = onObjectFinalized({
  region: 'asia-northeast3', // 서울 리전으로 변경
  memory: '1GiB' // 이미지 처리용 메모리 증가
}, async (event) => {
  const object = event.data;
  const fileBucket = object.bucket;
  const filePath = object.name;
  const contentType = object.contentType;
  const fileName = path.basename(filePath);
  
  // 이미지 파일인지 확인
  if (!contentType || !contentType.startsWith('image/')) {
    console.log('이미지 파일이 아닙니다:', contentType);
    return null;
  }
  
  // 원본 이미지가 아닌 처리된 이미지인지 확인 (무한 루프 방지)
  if (isProcessedImage(filePath)) {
    console.log('이미 처리된 이미지입니다:', filePath);
    return null;
  }

  // 특정 컬렉션에서만 이미지 처리 (저장된 데이터에 대해서만)
  const allowedCollections = ['jigRequests', 'qualityIssues', 'productionRequests', 'sampleRequests'];
  const isAllowedCollection = allowedCollections.some(collection => filePath.includes(collection));
  
  if (!isAllowedCollection) {
    console.log('허용되지 않은 컬렉션의 이미지입니다:', filePath);
    return null;
  }
  
  console.log('이미지 처리 시작:', filePath);
  
  try {
    // Storage에서 파일 다운로드
    const bucket = admin.storage().bucket(fileBucket);
    const tempFilePath = path.join(os.tmpdir(), fileName);
    const metadata = {
      contentType: contentType,
    };
    
    await bucket.file(filePath).download({ destination: tempFilePath });
    console.log('파일 다운로드 완료:', tempFilePath);
    
    // 이미지 메타데이터 추출
    const imageInfo = await sharp(tempFilePath).metadata();
    console.log('이미지 정보:', {
      width: imageInfo.width,
      height: imageInfo.height,
      format: imageInfo.format,
      size: imageInfo.size
    });
    
    // 다양한 크기와 포맷으로 변환
    const processedImages = [];
    
    // 병렬 처리를 위한 작업 배열 생성
    const processingTasks = [];
    
    for (const sizeKey of SUPPORTED_SIZES) {
      const config = IMAGE_CONFIGS[sizeKey];
      
      for (const format of SUPPORTED_FORMATS) {
        processingTasks.push(
          processImageSize(
            tempFilePath, 
            sizeKey, 
            format, 
            config, 
            imageInfo,
            bucket,
            filePath
          ).catch(error => {
            console.error(`이미지 처리 실패 (${sizeKey}, ${format}):`, error);
            return null;
          })
        );
      }
    }
    
    // 모든 이미지 변환을 병렬로 실행
    console.log(`이미지 변환 병렬 처리 시작: ${processingTasks.length}개 작업`);
    const results = await Promise.allSettled(processingTasks);
    
    // 성공한 결과만 수집
    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value) {
        processedImages.push(result.value);
      }
    });
    
    // 처리 결과를 Firestore에 저장
    await saveImageMetadata(filePath, imageInfo, processedImages);
    
    // 임시 파일 삭제
    fs.unlinkSync(tempFilePath);
    
    console.log('이미지 처리 완료:', processedImages.length, '개 파일 생성');
    return processedImages;
    
  } catch (error) {
    console.error('이미지 처리 중 오류:', error);
    return null;
  }
});

/**
 * 특정 크기와 포맷으로 이미지 처리
 */
async function processImageSize(tempFilePath, sizeKey, format, config, originalInfo, bucket, originalPath) {
  const fileName = path.basename(originalPath, path.extname(originalPath));
  const newFileName = `${fileName}_${sizeKey}.${format}`;
  const newFilePath = path.dirname(originalPath) + '/' + newFileName;
  
  let sharpInstance = sharp(tempFilePath);
  
  // 크기 조정 (original이 아닌 경우)
  if (sizeKey !== 'original') {
    sharpInstance = sharpInstance.resize(config.width, config.height, {
      fit: 'inside',
      withoutEnlargement: true
    });
  }
  
  // 포맷 변환
  let outputOptions = { quality: config.quality };
  
  switch (format) {
    case 'jpeg':
      sharpInstance = sharpInstance.jpeg(outputOptions);
      break;
    case 'webp':
      sharpInstance = sharpInstance.webp(outputOptions);
      break;
    case 'png':
      sharpInstance = sharpInstance.png(outputOptions);
      break;
  }
  
  // 변환된 이미지를 임시 파일로 저장
  const tempProcessedPath = path.join(os.tmpdir(), newFileName);
  await sharpInstance.toFile(tempProcessedPath);
  
  // Storage에 업로드
  await bucket.upload(tempProcessedPath, {
    destination: newFilePath,
    metadata: {
      contentType: `image/${format}`,
      metadata: {
        originalImage: originalPath,
        processedSize: sizeKey,
        processedFormat: format,
        originalSize: originalInfo.size,
        originalDimensions: `${originalInfo.width}x${originalInfo.height}`
      }
    }
  });
  
  // 임시 파일 삭제
  fs.unlinkSync(tempProcessedPath);
  
  // 처리된 이미지 정보 반환
  const stats = fs.statSync(tempProcessedPath);
  return {
    path: newFilePath,
    size: sizeKey,
    format: format,
    fileSize: stats.size,
    url: `gs://${bucket.name}/${newFilePath}`
  };
}

/**
 * 이미지 메타데이터를 Firestore에 저장
 */
async function saveImageMetadata(originalPath, imageInfo, processedImages) {
  const db = admin.firestore();
  const imageId = path.basename(originalPath, path.extname(originalPath));
  
  const imageMetadata = {
    originalPath: originalPath,
    originalSize: imageInfo.size,
    originalDimensions: {
      width: imageInfo.width,
      height: imageInfo.height
    },
    originalFormat: imageInfo.format,
    processedImages: processedImages,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };
  
  await db.collection('imageMetadata').doc(imageId).set(imageMetadata);
  console.log('이미지 메타데이터 저장 완료:', imageId);
}

/**
 * 처리된 이미지인지 확인 (무한 루프 방지)
 */
function isProcessedImage(filePath) {
  const fileName = path.basename(filePath, path.extname(filePath));
  return SUPPORTED_SIZES.some(size => fileName.includes(`_${size}`));
}

/**
 * HTTP 함수 - 특정 이미지 재처리
 */
exports.reprocessImage = onCall({
  region: 'asia-northeast3', // 서울 리전으로 변경
  memory: '1GiB' // 이미지 처리용 메모리 증가
}, async (request) => {
  const data = request.data;
  const context = request.auth;
  
  // 인증 확인
  if (!context) {
    throw new Error('인증이 필요합니다.');
  }
  
  const { imagePath } = data;
  
  if (!imagePath) {
    throw new Error('이미지 경로가 필요합니다.');
  }
  
  try {
    // 이미지 재처리 로직 실행
    const result = await reprocessImageFile(imagePath);
    return { success: true, result };
  } catch (error) {
    console.error('이미지 재처리 실패:', error);
    throw new Error('이미지 재처리에 실패했습니다.');
  }
});

/**
 * 이미지 재처리 함수
 */
async function reprocessImageFile(imagePath) {
  // 기존 처리된 이미지들 삭제
  await deleteProcessedImages(imagePath);
  
  // 새로운 이미지 처리 트리거
  const bucket = admin.storage().bucket();
  const file = bucket.file(imagePath);
  
  // 파일 메타데이터 가져오기
  const [metadata] = await file.getMetadata();
  
  // 이미지 처리 트리거 시뮬레이션
  const object = {
    bucket: bucket.name,
    name: imagePath,
    contentType: metadata.contentType
  };
  
  return await exports.processImage(object);
}

/**
 * 처리된 이미지들 삭제
 */
async function deleteProcessedImages(originalPath) {
  const bucket = admin.storage().bucket();
  const fileName = path.basename(originalPath, path.extname(originalPath));
  const dirPath = path.dirname(originalPath);
  
  for (const sizeKey of SUPPORTED_SIZES) {
    if (sizeKey === 'original') continue;
    
    for (const format of SUPPORTED_FORMATS) {
      const processedFileName = `${fileName}_${sizeKey}.${format}`;
      const processedPath = path.join(dirPath, processedFileName);
      
      try {
        await bucket.file(processedPath).delete();
        console.log('처리된 이미지 삭제:', processedPath);
      } catch (error) {
        // 파일이 없으면 무시
        console.log('삭제할 파일이 없음:', processedPath);
      }
    }
  }
}

/**
 * 수동 이미지 처리 HTTP 함수
 * 저장 시점에 특정 이미지들을 처리할 때 사용
 */
exports.processImagesManually = onCall({
  region: 'asia-northeast3', // 서울 리전으로 변경
  memory: '1GiB' // 이미지 처리용 메모리 증가
}, async (request) => {
  const data = request.data;
  const context = request.auth;
  // 인증 확인
  if (!context) {
    throw new Error('인증이 필요합니다.');
  }

  const { imageUrls, collectionName } = data;
  
  if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
    throw new Error('이미지 URL 배열이 필요합니다.');
  }

  if (!collectionName) {
    throw new Error('컬렉션 이름이 필요합니다.');
  }

  try {
    console.log(`이미지 병렬 처리 시작: ${imageUrls.length}개 이미지`);
    
    // 병렬로 이미지 처리 (최대 5개씩 배치 처리)
    const BATCH_SIZE = 5;
    const results = [];
    
    for (let i = 0; i < imageUrls.length; i += BATCH_SIZE) {
      const batch = imageUrls.slice(i, i + BATCH_SIZE);
      console.log(`배치 ${Math.floor(i / BATCH_SIZE) + 1} 처리 중: ${batch.length}개 이미지`);
      
      const batchPromises = batch.map(async (imageUrl) => {
        try {
          // Firebase Storage URL에서 파일 경로 추출
          const filePath = extractFilePathFromUrl(imageUrl);
          
          if (!filePath) {
            console.warn('파일 경로를 추출할 수 없습니다:', imageUrl);
            return {
              originalUrl: imageUrl,
              error: '파일 경로 추출 실패'
            };
          }

          // 이미지 처리 실행
          const result = await processSingleImage(filePath, collectionName);
          return {
            originalUrl: imageUrl,
            processedUrls: result
          };
          
        } catch (error) {
          console.error('이미지 처리 실패:', imageUrl, error);
          return {
            originalUrl: imageUrl,
            error: error.message
          };
        }
      });
      
      // 배치 병렬 처리
      const batchResults = await Promise.allSettled(batchPromises);
      
      // 결과 수집
      batchResults.forEach(result => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error('배치 처리 실패:', result.reason);
          results.push({
            originalUrl: 'unknown',
            error: result.reason?.message || '알 수 없는 오류'
          });
        }
      });
      
      console.log(`배치 ${Math.floor(i / BATCH_SIZE) + 1} 완료`);
    }

    return {
      success: true,
      processedCount: results.filter(r => !r.error).length,
      errorCount: results.filter(r => r.error).length,
      results
    };

  } catch (error) {
    console.error('수동 이미지 처리 실패:', error);
    throw new Error('이미지 처리 중 오류가 발생했습니다.');
  }
});

/**
 * Firebase Storage URL에서 파일 경로 추출
 */
function extractFilePathFromUrl(url) {
  try {
    const urlObj = new URL(url);
    const pathMatch = urlObj.pathname.match(/\/v0\/b\/[^/]+\/o\/(.+)/);
    return pathMatch ? decodeURIComponent(pathMatch[1]) : null;
  } catch (error) {
    console.error('URL 파싱 실패:', url, error);
    return null;
  }
}

/**
 * 단일 이미지 처리
 */
async function processSingleImage(filePath, collectionName) {
  const bucket = admin.storage().bucket();
  const file = bucket.file(filePath);
  
  // 파일 존재 확인
  const [exists] = await file.exists();
  if (!exists) {
    throw new Error('파일이 존재하지 않습니다: ' + filePath);
  }

  // 파일 메타데이터 가져오기
  const [metadata] = await file.getMetadata();
  
  // 이미지 파일인지 확인
  if (!metadata.contentType || !metadata.contentType.startsWith('image/')) {
    throw new Error('이미지 파일이 아닙니다: ' + metadata.contentType);
  }

  // 이미 처리된 파일인지 확인
  if (isProcessedImage(filePath)) {
    console.log('이미 처리된 이미지입니다:', filePath);
    return null;
  }

  // 이미지 처리 실행
  const tempFilePath = path.join(os.tmpdir(), path.basename(filePath));
  
  try {
    // 파일 다운로드
    await file.download({ destination: tempFilePath });
    
    // 이미지 처리
    const results = await processImageVariants(tempFilePath, filePath, collectionName);
    
    return results;
    
  } finally {
    // 임시 파일 정리
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
}
