const { onObjectFinalized } = require('firebase-functions/v2/storage');
const admin = require('firebase-admin');
const sharp = require('sharp');
const path = require('path');
const os = require('os');
const fs = require('fs');

/**
 * Storage 트리거: 이미지 업로드 시 자동 처리
 * 
 * 처리 전략:
 * 1. HEIF/HEIC 파일: 변환 (HEIC → JPEG) + 썸네일 생성
 * 2. 일반 이미지: 썸네일 생성만
 * 
 * 최적화 전략:
 * - HEIF/HEIC: 서버에서 JPEG 변환 (1920px, 85% quality) + 썸네일 (300px, WebP, 80% quality)
 * - 일반 이미지: 클라이언트 압축 + 서버 썸네일 생성
 * - 총 파일: 2개 (변환된 JPEG + 썸네일) - 비용 효율적
 */
exports.generateImageThumbnail = onObjectFinalized({
  region: 'asia-northeast3', // 한국 리전
  memory: '1GiB', // HEIC 변환 시 메모리 증가
  timeoutSeconds: 120, // HEIC 변환 시간 고려
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
    console.log('이미지 처리 대상 폴더 아님:', filePath);
    return null;
  }
  
  // HEIF/HEIC 파일인지 확인
  const isHeicFile = contentType.includes('heic') || contentType.includes('heif') || 
                    filePath.toLowerCase().includes('.heic') || filePath.toLowerCase().includes('.heif');
  
  console.log(`${isHeicFile ? 'HEIC 변환 + 썸네일 생성' : '썸네일 생성'} 시작:`, filePath);
  
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
    
    let processedImageBuffer;
    let finalFilePath = filePath;
    
    if (isHeicFile) {
      // HEIC → JPEG 변환
      console.log('HEIC → JPEG 변환 시작...');
      processedImageBuffer = await sharp(tempFilePath)
        .jpeg({ quality: 85 })
        .resize(1920, 1920, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .toBuffer();
      
      console.log('HEIC → JPEG 변환 완료');
      
      // 변환된 JPEG 파일을 원본 위치에 저장 (원본 HEIC 파일 덮어쓰기)
      const jpegFileName = fileName.replace(/\.(heic|heif)$/i, '.jpg');
      const jpegFilePath = path.join(fileDir, jpegFileName);
      
      await bucket.file(jpegFilePath).save(processedImageBuffer, {
        metadata: {
          contentType: 'image/jpeg',
          metadata: {
            originalFormat: contentType,
            convertedFrom: 'heic',
            convertedAt: new Date().toISOString(),
            processedBy: 'cloud-function'
          }
        }
      });
      
      console.log('변환된 JPEG 파일 저장 완료:', jpegFilePath);
      
      // 원본 HEIC 파일 삭제
      await bucket.file(filePath).delete();
      console.log('원본 HEIC 파일 삭제 완료:', filePath);
      
      finalFilePath = jpegFilePath;
    } else {
      // 일반 이미지는 원본 사용
      processedImageBuffer = fs.readFileSync(tempFilePath);
    }
    
    // 썸네일 생성 (300px, WebP, 80% quality)
    console.log('썸네일 생성 시작...');
    await sharp(processedImageBuffer)
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
          originalImage: finalFilePath,
          thumbnailSize: '300x300',
          generatedBy: 'cloud-function',
          generatedAt: new Date().toISOString(),
          convertedFrom: isHeicFile ? 'heic' : 'original'
        }
      }
    });
    
    console.log('썸네일 업로드 완료:', thumbPath);
    
    // 임시 파일 삭제
    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
    if (fs.existsSync(tempThumbPath)) fs.unlinkSync(tempThumbPath);
    
    return { 
      success: true, 
      thumbnailPath: thumbPath,
      converted: isHeicFile,
      finalImagePath: finalFilePath
    };
    
  } catch (error) {
    console.error('이미지 처리 실패:', error);
    return null;
  }
});



