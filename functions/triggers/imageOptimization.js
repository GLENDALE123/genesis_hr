const { onObjectFinalized } = require('firebase-functions/v2/storage');
const admin = require('firebase-admin');
const sharp = require('sharp');
const path = require('path');
const os = require('os');
const fs = require('fs');

/**
 * Storage 트리거: 이미지 업로드 시 자동 썸네일 생성
 * 
 * 최적화 전략:
 * - 원본: 클라이언트에서 압축된 파일 (1920px, 85% quality)
 * - 썸네일: 서버에서 생성 (300px, WebP, 80% quality)
 * - 총 파일: 2개 (원본 + 썸네일) - 비용 효율적
 */
exports.generateImageThumbnail = onObjectFinalized({
  region: 'asia-northeast3', // 한국 리전
  memory: '512MiB', // 썸네일만 생성하므로 메모리 절약
  timeoutSeconds: 60,
}, async (event) => {
  const object = event.data;
  const fileBucket = object.bucket;
  const filePath = object.name;
  const contentType = object.contentType;
  
  // 이미지 파일인지 확인
  if (!contentType || !contentType.startsWith('image/')) {
    console.log('이미지 파일이 아님:', contentType);
    return null;
  }
  
  // 이미 썸네일인지 확인 (무한 루프 방지)
  if (filePath.includes('_thumb.webp')) {
    console.log('이미 썸네일 파일:', filePath);
    return null;
  }
  
  // 허용된 폴더만 처리 (비용 절약)
  const allowedFolders = ['production-requests', 'packaging-reports', 'quality-issues'];
  const isAllowedFolder = allowedFolders.some(folder => filePath.startsWith(folder));
  
  if (!isAllowedFolder) {
    console.log('썸네일 생성 대상 폴더 아님:', filePath);
    return null;
  }
  
  console.log('썸네일 생성 시작:', filePath);
  
  try {
    const bucket = admin.storage().bucket(fileBucket);
    const fileName = path.basename(filePath);
    const fileDir = path.dirname(filePath);
    const fileNameWithoutExt = path.basename(fileName, path.extname(fileName));
    
    // 임시 파일 경로
    const tempFilePath = path.join(os.tmpdir(), fileName);
    const tempThumbPath = path.join(os.tmpdir(), `${fileNameWithoutExt}_thumb.webp`);
    
    // Storage에서 파일 다운로드
    await bucket.file(filePath).download({ destination: tempFilePath });
    console.log('파일 다운로드 완료:', tempFilePath);
    
    // 썸네일 생성 (300px, WebP, 80% quality)
    await sharp(tempFilePath)
      .resize(300, 300, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality: 80 })
      .toFile(tempThumbPath);
    
    console.log('썸네일 생성 완료:', tempThumbPath);
    
    // 썸네일을 Storage에 업로드
    const thumbPath = path.join(fileDir, `${fileNameWithoutExt}_thumb.webp`);
    await bucket.upload(tempThumbPath, {
      destination: thumbPath,
      metadata: {
        contentType: 'image/webp',
        metadata: {
          originalImage: filePath,
          thumbnailSize: '300x300',
          generatedBy: 'cloud-function',
          generatedAt: new Date().toISOString(),
        }
      }
    });
    
    console.log('썸네일 업로드 완료:', thumbPath);
    
    // 임시 파일 삭제
    fs.unlinkSync(tempFilePath);
    fs.unlinkSync(tempThumbPath);
    
    return { success: true, thumbnailPath: thumbPath };
    
  } catch (error) {
    console.error('썸네일 생성 실패:', error);
    return null;
  }
});



