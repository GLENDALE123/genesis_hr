/**
 * Electron 릴리스 파일을 Firebase Storage에 업로드하는 스크립트
 * 
 * 사용법:
 * node scripts/upload-electron-release.js <version> <installerPath>
 * 
 * 예시:
 * node scripts/upload-electron-release.js 0.2.0 dist/TMS-Setup-0.2.0.exe
 */

const { ref, uploadBytes, getDownloadURL } = require('firebase/storage');
const fs = require('fs');
const path = require('path');

// Firebase 초기화 (환경변수에서 가져오기)
const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json'); // Firebase Admin SDK 키 파일 필요

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'hs-jig-b2093.appspot.com',
  });
}

const bucket = admin.storage().bucket();

async function uploadRelease(version, installerPath) {
  try {
    console.log(`📦 Electron 릴리스 업로드 시작: v${version}`);

    // 1. 설치 파일 업로드
    const fileName = path.basename(installerPath);
    const filePath = `electron-releases/${fileName}`;
    
    console.log(`📤 설치 파일 업로드 중: ${fileName}`);
    await bucket.upload(installerPath, {
      destination: filePath,
      metadata: {
        contentType: 'application/x-msdownload',
      },
    });

    const installerRef = bucket.file(filePath);
    const [installerUrl] = await installerRef.getSignedUrl({
      action: 'read',
      expires: '03-09-2491', // 2100년까지 유효
    });

    // 파일 크기 가져오기
    const [metadata] = await installerRef.getMetadata();
    const fileSize = metadata.size;

    // 2. latest.json 생성 및 업로드
    const latestInfo = {
      version,
      fileName,
      size: parseInt(fileSize),
      publishedAt: new Date().toISOString(),
    };

    const latestJsonPath = path.join(__dirname, 'latest.json.tmp');
    fs.writeFileSync(latestJsonPath, JSON.stringify(latestInfo, null, 2));

    console.log(`📤 최신 버전 정보 업로드 중: latest.json`);
    await bucket.upload(latestJsonPath, {
      destination: 'electron-releases/latest.json',
      metadata: {
        contentType: 'application/json',
      },
    });

    // 임시 파일 삭제
    fs.unlinkSync(latestJsonPath);

    console.log('✅ 업로드 완료!');
    console.log(`   버전: v${version}`);
    console.log(`   파일: ${fileName}`);
    console.log(`   크기: ${(fileSize / 1024 / 1024).toFixed(1)} MB`);
    console.log(`   다운로드 URL: ${installerUrl}`);

  } catch (error) {
    console.error('❌ 업로드 실패:', error);
    process.exit(1);
  }
}

// 명령줄 인자 파싱
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('사용법: node upload-electron-release.js <version> <installerPath>');
  console.error('예시: node upload-electron-release.js 0.2.0 dist/TMS-Setup-0.2.0.exe');
  process.exit(1);
}

const [version, installerPath] = args;

if (!fs.existsSync(installerPath)) {
  console.error(`❌ 파일을 찾을 수 없습니다: ${installerPath}`);
  process.exit(1);
}

uploadRelease(version, installerPath);

