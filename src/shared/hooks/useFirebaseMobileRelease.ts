
import { useState, useEffect } from 'react';
import { ref, getDownloadURL, getMetadata } from 'firebase/storage';
import { storage } from '@/shared/services/firebase/config';

interface MobileRelease {
  version: string;
  downloadUrl: string;
  size: number;
  publishedAt: string;
  fileName: string;
}

interface LatestReleaseInfo {
  version: string;
  downloadUrl: string;
  size: number;
  publishedAt: string;
  fileName: string;
}

export function useFirebaseMobileRelease() {
  const [latestRelease, setLatestRelease] = useState<LatestReleaseInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLatestRelease = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (!storage) {
          setError('Firebase Storage가 초기화되지 않았습니다.');
          setIsLoading(false);
          return;
        }

        // latest.json 파일에서 최신 버전 정보 가져오기
        const latestInfoRef = ref(storage, 'mobile-releases/latest.json');
        
        try {
          const latestInfoUrl = await getDownloadURL(latestInfoRef);
          const response = await fetch(latestInfoUrl);
          
          if (!response.ok) {
            throw new Error(`최신 릴리스 정보를 가져올 수 없습니다: ${response.status}`);
          }

          const latestInfo: MobileRelease = await response.json();

          // 실제 설치 파일의 다운로드 URL 가져오기
          // fileName이 있으면 사용, 없으면 고정 파일명 사용 (하위 호환성)
          const fileName = latestInfo.fileName || 'TMS-Mobile-latest.apk';
          const installerRef = ref(storage, `mobile-releases/${fileName}`);
          const downloadUrl = await getDownloadURL(installerRef);

          // 파일 크기 가져오기 (메타데이터에서)
          const metadata = await getMetadata(installerRef);
          const fileSize = metadata.size || latestInfo.size;

          setLatestRelease({
            version: latestInfo.version,
            downloadUrl,
            size: fileSize,
            publishedAt: latestInfo.publishedAt,
            fileName: fileName,
          });
        } catch (fetchError: any) {
          // latest.json이 없으면 에러 표시
          setError('최신 릴리스 정보를 찾을 수 없습니다.');
        }
      } catch (err: any) {
        setError(err.message || '릴리스를 가져올 수 없습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLatestRelease();
  }, []);

  // 설치 파일 정보 반환 (GitHub API와 호환성을 위한 형식)
  const installerAsset = latestRelease
    ? {
        name: latestRelease.fileName,
        browser_download_url: latestRelease.downloadUrl,
        size: latestRelease.size,
      }
    : null;

  return {
    latestRelease: latestRelease
      ? {
          tag_name: `v${latestRelease.version}`,
          name: `TMS 통합관리시스템 모바일 v${latestRelease.version}`,
          published_at: latestRelease.publishedAt,
        }
      : null,
    installerAsset,
    isLoading,
    error,
  };
}


