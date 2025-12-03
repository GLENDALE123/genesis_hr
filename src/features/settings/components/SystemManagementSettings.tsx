/**
 * 시스템 관리 설정 탭 (관리자 전용)
 * 제품명 및 발주처 대소문자 정규화 도구
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert';
import { Badge } from '@/shared/components/ui/badge';
import { Spinner } from '@/shared/components/ui/spinner';
import { AlertCircle, CheckCircle2, Eye, Play } from 'lucide-react';
import { useToast } from '@/shared/hooks/use-toast';

interface NormalizeResult {
  success: boolean;
  message: string;
  stats: {
    total: number;
    updated: number;
    skipped: number;
    dryRun: boolean;
  };
  sampleChanges?: Array<{
    docId: string;
    field: string;
    before: string;
    after: string;
  }>;
  error?: string;
}

const FUNCTIONS_BASE_URL = 'https://asia-northeast3-hs-jig-b2093.cloudfunctions.net';

export const SystemManagementSettings: React.FC = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<NormalizeResult | null>(null);
  const [isDryRun, setIsDryRun] = useState(true);

  const handleNormalize = async (dryRun: boolean) => {
    setIsLoading(true);
    setResult(null);
    setIsDryRun(dryRun);

    try {
      const response = await fetch(`${FUNCTIONS_BASE_URL}/normalizeProductNames`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dryRun }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `요청 실패: ${response.status}`);
      }

      const data: NormalizeResult = await response.json();
      setResult(data);

      if (data.success) {
        toast({
          title: dryRun ? '미리보기 완료' : '정규화 완료',
          description: data.message,
        });
      } else {
        toast({
          title: '오류 발생',
          description: data.error || '알 수 없는 오류가 발생했습니다.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      setResult({
        success: false,
        message: '정규화 실패',
        stats: {
          total: 0,
          updated: 0,
          skipped: 0,
          dryRun,
        },
        error: errorMessage,
      });
      toast({
        title: '오류 발생',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>제품명 및 발주처 정규화</CardTitle>
          <CardDescription>
            생산일보의 제품명과 발주처 필드에서 알파벳 대소문자를 대문자로 통일합니다.
            <br />
            예: &quot;60g줄기세포크림&quot; → &quot;60G줄기세포크림&quot;
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => handleNormalize(true)}
              disabled={isLoading}
              variant="outline"
              className="flex-1"
            >
              {isLoading && isDryRun ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  확인 중...
                </>
              ) : (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  미리보기 (변경 내역 확인)
                </>
              )}
            </Button>
            <Button
              onClick={() => handleNormalize(false)}
              disabled={isLoading}
              variant="default"
              className="flex-1"
            >
              {isLoading && !isDryRun ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  실행 중...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  실제 업데이트 실행
                </>
              )}
            </Button>
          </div>

          {result && (
            <Alert
              variant={result.success ? 'default' : 'destructive'}
              className="mt-4"
            >
              {result.success ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertTitle>
                {result.success ? '완료' : '오류'}
              </AlertTitle>
              <AlertDescription className="space-y-2">
                <p>{result.message}</p>
                {result.stats && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="secondary">
                      전체: {result.stats.total}개
                    </Badge>
                    <Badge variant={result.stats.updated > 0 ? 'default' : 'secondary'}>
                      업데이트: {result.stats.updated}개
                    </Badge>
                    <Badge variant="secondary">
                      건너뜀: {result.stats.skipped}개
                    </Badge>
                    {result.stats.dryRun && (
                      <Badge variant="outline">
                        미리보기 모드
                      </Badge>
                    )}
                  </div>
                )}
                {result.error && (
                  <p className="text-sm text-destructive mt-2">
                    {result.error}
                  </p>
                )}
              </AlertDescription>
            </Alert>
          )}

          {result?.sampleChanges && result.sampleChanges.length > 0 && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-sm">변경 내역 샘플</CardTitle>
                <CardDescription className="text-xs">
                  처음 20개 변경 내역만 표시됩니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {result.sampleChanges.map((change, index) => (
                    <div
                      key={index}
                      className="p-3 border rounded-md bg-muted/50 text-sm"
                    >
                      <div className="font-semibold mb-1">
                        문서 ID: {change.docId.substring(0, 20)}...
                      </div>
                      <div className="space-y-1">
                        <div>
                          <span className="font-medium">필드:</span>{' '}
                          <Badge variant="outline" className="ml-1">
                            {change.field}
                          </Badge>
                        </div>
                        <div>
                          <span className="font-medium">변경 전:</span>{' '}
                          <span className="text-muted-foreground line-through">
                            {change.before}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">변경 후:</span>{' '}
                          <span className="text-primary font-semibold">
                            {change.after}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Alert className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>주의사항</AlertTitle>
            <AlertDescription className="space-y-1 text-sm">
              <p>• 먼저 &quot;미리보기&quot; 버튼으로 변경 내역을 확인하세요.</p>
              <p>• 실제 업데이트는 되돌릴 수 없습니다.</p>
              <p>• 대량 업데이트는 시간이 걸릴 수 있습니다.</p>
              <p>• 업데이트된 문서의 updatedAt 필드가 자동으로 갱신됩니다.</p>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

