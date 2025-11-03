'use client';

import { useState, useEffect } from 'react';

interface GitHubRelease {
  tag_name: string;
  name: string;
  published_at: string;
  assets: Array<{
    name: string;
    browser_download_url: string;
    size: number;
  }>;
}

export function useGitHubRelease() {
  const [latestRelease, setLatestRelease] = useState<GitHubRelease | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLatestRelease = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch(
          'https://api.github.com/repos/mir1102/HS-Jig/releases/latest',
          {
            headers: {
              'Accept': 'application/vnd.github.v3+json',
            },
          }
        );

        if (!response.ok) {
          if (response.status === 404) {
            setError('릴리스를 찾을 수 없습니다.');
            return;
          }
          throw new Error(`GitHub API 오류: ${response.status}`);
        }

        const data: GitHubRelease = await response.json();
        setLatestRelease(data);
      } catch (err: any) {
        console.error('최신 릴리스 가져오기 실패:', err);
        setError(err.message || '릴리스를 가져올 수 없습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLatestRelease();
  }, []);

  // 설치 파일 찾기 (.exe 파일)
  const installerAsset = latestRelease?.assets.find(asset => 
    asset.name.endsWith('.exe') && asset.name.includes('Setup')
  );

  return {
    latestRelease,
    installerAsset,
    isLoading,
    error,
  };
}

