/**
 * 사용자 동기화 마이그레이션 패널 컴포넌트
 * PS: 독립 피처 - 삭제 가능
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Spinner } from '@/shared/components/ui/spinner';
import { toast } from 'sonner';
import { analyzeUserSync, migrateUserSync, deleteAuthUsers, getUserAuthInfo, removePhoneNumberFromFirestore } from '../services/migrationApi';
import type { UserSyncAnalysis, MigrateUserSyncResults, DeleteAuthUsersResults, AuthUserInfo, RemovePhoneNumberResults } from '../types';
import { Database, RefreshCw, CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronUp, Search, Trash2, User } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';

export const MigrationPanel: React.FC = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRemovingPhone, setIsRemovingPhone] = useState(false);
  const [isGettingInfo, setIsGettingInfo] = useState(false);
  const [analysis, setAnalysis] = useState<UserSyncAnalysis | null>(null);
  const [results, setResults] = useState<MigrateUserSyncResults | null>(null);
  const [deleteResults, setDeleteResults] = useState<DeleteAuthUsersResults | null>(null);
  const [removePhoneResults, setRemovePhoneResults] = useState<RemovePhoneNumberResults | null>(null);
  const [authUserInfo, setAuthUserInfo] = useState<AuthUserInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [selectedDeleteUids, setSelectedDeleteUids] = useState<string[]>([]);
  const [searchEmail, setSearchEmail] = useState('');
  const [searchUid, setSearchUid] = useState('');

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setError(null);
    setAnalysis(null);

    try {
      const response = await analyzeUserSync();
      if (response.ok && response.analysis) {
        setAnalysis(response.analysis);
        toast.success('분석이 완료되었습니다.');
      } else {
        throw new Error(response.error || '분석 중 오류가 발생했습니다.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleMigrate = async (dryRun: boolean = false) => {
    if (!analysis && !dryRun) {
      toast.error('먼저 분석을 실행해주세요.');
      return;
    }

    const confirmMessage = dryRun
      ? '시뮬레이션 모드로 마이그레이션을 실행하시겠습니까?'
      : '실제로 마이그레이션을 실행하시겠습니까? 이 작업은 되돌릴 수 없습니다.';
    
    if (!confirm(confirmMessage)) {
      return;
    }

    setIsMigrating(true);
    setError(null);
    setResults(null);

    try {
      const response = await migrateUserSync(dryRun);
      if (response.ok && response.results) {
        setResults(response.results);
        toast.success(
          dryRun
            ? `시뮬레이션 완료: ${response.results.updated.auth.displayName + response.results.updated.firestore.position}건이 업데이트될 예정입니다.`
            : '마이그레이션이 완료되었습니다.'
        );
      } else {
        throw new Error(response.error || '마이그레이션 중 오류가 발생했습니다.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsMigrating(false);
    }
  };

  const handleDelete = async (dryRun: boolean = false) => {
    if (selectedDeleteUids.length === 0) {
      toast.error('삭제할 사용자를 선택해주세요.');
      return;
    }

    const confirmMessage = dryRun
      ? `${selectedDeleteUids.length}명의 사용자 삭제를 시뮬레이션하시겠습니까?`
      : `정말로 ${selectedDeleteUids.length}명의 사용자를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    setIsDeleting(true);
    setError(null);
    setDeleteResults(null);

    try {
      const response = await deleteAuthUsers(selectedDeleteUids, dryRun);
      if (response.ok && response.results) {
        setDeleteResults(response.results);
        toast.success(
          dryRun
            ? `시뮬레이션 완료: ${response.results.deleted}명이 삭제될 예정입니다.`
            : `${response.results.deleted}명의 사용자가 삭제되었습니다.`
        );
        
        if (!dryRun) {
          // 삭제 후 분석 다시 실행
          await handleAnalyze();
          setSelectedDeleteUids([]);
        }
      } else {
        throw new Error(response.error || '삭제 중 오류가 발생했습니다.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleGetUserInfo = async () => {
    if (!searchEmail && !searchUid) {
      toast.error('이메일 또는 UID를 입력해주세요.');
      return;
    }

    setIsGettingInfo(true);
    setError(null);
    setAuthUserInfo(null);

    try {
      const response = await getUserAuthInfo(searchUid || undefined, searchEmail || undefined);
      if (response.ok && response.user) {
        setAuthUserInfo(response.user);
        toast.success('사용자 정보를 조회했습니다.');
      } else {
        throw new Error(response.error || '조회 중 오류가 발생했습니다.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsGettingInfo(false);
    }
  };

  const handleRemovePhoneNumber = async (dryRun: boolean = false) => {
    const confirmMessage = dryRun
      ? 'Firestore의 phoneNumber 필드를 삭제하는 시뮬레이션을 실행하시겠습니까?'
      : '정말로 Firestore의 모든 phoneNumber 필드를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.';
    
    if (!confirm(confirmMessage)) {
      return;
    }

    setIsRemovingPhone(true);
    setError(null);
    setRemovePhoneResults(null);

    try {
      const response = await removePhoneNumberFromFirestore(dryRun);
      if (response.ok && response.results) {
        setRemovePhoneResults(response.results);
        toast.success(
          dryRun
            ? `시뮬레이션 완료: ${response.results.removed}건의 phoneNumber 필드가 삭제될 예정입니다.`
            : `${response.results.removed}건의 phoneNumber 필드가 삭제되었습니다.`
        );
      } else {
        throw new Error(response.error || '삭제 중 오류가 발생했습니다.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsRemovingPhone(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            사용자 데이터 동기화
          </CardTitle>
          <CardDescription>
            Firebase Auth와 Firestore users 컬렉션 간의 사용자 정보를 분석하고 동기화합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing || isMigrating}
              variant="outline"
            >
              {isAnalyzing ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  분석 중...
                </>
              ) : (
                <>
                  <Database className="mr-2 h-4 w-4" />
                  분석 실행
                </>
              )}
            </Button>
            <Button
              onClick={() => handleMigrate(true)}
              disabled={isAnalyzing || isMigrating}
              variant="outline"
            >
              {isMigrating ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  실행 중...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  시뮬레이션 실행
                </>
              )}
            </Button>
            <Button
              onClick={() => handleMigrate(false)}
              disabled={isAnalyzing || isMigrating || !analysis}
              variant="default"
            >
              {isMigrating ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  마이그레이션 중...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  마이그레이션 실행
                </>
              )}
            </Button>
            <Button
              onClick={() => handleRemovePhoneNumber(true)}
              disabled={isRemovingPhone}
              variant="outline"
            >
              {isRemovingPhone ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  실행 중...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  phoneNumber 삭제 시뮬레이션
                </>
              )}
            </Button>
            <Button
              onClick={() => handleRemovePhoneNumber(false)}
              disabled={isRemovingPhone}
              variant="destructive"
            >
              {isRemovingPhone ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  삭제 중...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  phoneNumber 일괄 삭제
                </>
              )}
            </Button>
          </div>
          
          {/* 사용자 정보 조회 */}
          <div className="border rounded-md p-4 space-y-2">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <User className="h-4 w-4" />
              Firebase Auth 사용자 정보 조회
            </h4>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="이메일"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-md text-sm"
              />
              <span className="self-center text-sm text-muted-foreground">또는</span>
              <input
                type="text"
                placeholder="UID"
                value={searchUid}
                onChange={(e) => setSearchUid(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-md text-sm"
              />
              <Button
                onClick={handleGetUserInfo}
                disabled={isGettingInfo}
                variant="outline"
                size="sm"
              >
                {isGettingInfo ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    조회 중...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    조회
                  </>
                )}
              </Button>
            </div>
            {authUserInfo && (
              <div className="mt-4 border rounded-md p-4 bg-muted/50">
                <h5 className="font-semibold mb-2">사용자 정보</h5>
                <div className="space-y-1 text-sm">
                  <div><span className="font-medium">UID:</span> {authUserInfo.uid}</div>
                  <div><span className="font-medium">이메일:</span> {authUserInfo.email || '(없음)'}</div>
                  <div><span className="font-medium">표시 이름 (displayName):</span> {authUserInfo.displayName || '(없음)'}</div>
                  <div><span className="font-medium">전화번호:</span> {authUserInfo.phoneNumber || '(없음)'}</div>
                  <div><span className="font-medium">프로필 사진:</span> {authUserInfo.photoURL || '(없음)'}</div>
                  <div><span className="font-medium">이메일 인증:</span> {authUserInfo.emailVerified ? '예' : '아니오'}</div>
                  <div><span className="font-medium">계정 상태:</span> {authUserInfo.disabled ? '비활성화' : '활성화'}</div>
                  <div><span className="font-medium">생성 날짜:</span> {new Date(authUserInfo.metadata.creationTime).toLocaleString('ko-KR')}</div>
                  <div><span className="font-medium">최종 로그인:</span> {authUserInfo.metadata.lastSignInTime ? new Date(authUserInfo.metadata.lastSignInTime).toLocaleString('ko-KR') : '(없음)'}</div>
                </div>
              </div>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {analysis && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">분석 결과</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Firebase Auth 사용자</div>
                    <div className="text-2xl font-bold">{analysis.totalAuthUsers}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Firestore 사용자</div>
                    <div className="text-2xl font-bold">{analysis.totalFirestoreUsers}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">매칭된 사용자</div>
                    <div className="text-2xl font-bold">{analysis.matchedUsers}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">불일치 항목</div>
                    <div className="text-2xl font-bold">
                      {analysis.mismatches.displayName.count +
                        analysis.mismatches.email.count +
                        analysis.mismatches.photoURL.count +
                        analysis.mismatches.phoneNumber.count}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* displayName */}
                  <div className="border rounded-md p-4 space-y-2">
                    <h4 className="font-semibold text-sm">displayName</h4>
                    
                    {/* 불일치 */}
                    <Collapsible
                      open={expandedSections.displayName}
                      onOpenChange={(open) => setExpandedSections({ ...expandedSections, displayName: open })}
                    >
                      <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-md hover:bg-muted transition-colors">
                        <div className="flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-destructive" />
                          <span className="text-sm font-medium">불일치</span>
                          <span className="text-sm text-muted-foreground">
                            ({analysis.mismatches.displayName.count}건)
                          </span>
                        </div>
                        {expandedSections.displayName ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2">
                        {analysis.mismatches.displayName.details.length > 0 ? (
                          <div className="border rounded-md overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-[150px]">이메일</TableHead>
                                  <TableHead>Firestore</TableHead>
                                  <TableHead>Firebase Auth</TableHead>
                                  <TableHead className="bg-blue-50 dark:bg-blue-950">분리 후 이름</TableHead>
                                  <TableHead className="bg-blue-50 dark:bg-blue-950">분리 후 직급</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {analysis.mismatches.displayName.details.map((detail, idx) => (
                                  <TableRow key={idx}>
                                    <TableCell className="font-medium">{detail.email || detail.uid}</TableCell>
                                    <TableCell>{detail.firestore || '(없음)'}</TableCell>
                                    <TableCell>{detail.auth || '(없음)'}</TableCell>
                                    <TableCell className="bg-blue-50 dark:bg-blue-950 font-semibold">{detail.suggestedName || '-'}</TableCell>
                                    <TableCell className="bg-blue-50 dark:bg-blue-950">{detail.suggestedPosition || '-'}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground p-2">불일치 항목이 없습니다.</div>
                        )}
                      </CollapsibleContent>
                    </Collapsible>

                    {/* 일치 */}
                    <Collapsible
                      open={expandedSections.displayNameMatch}
                      onOpenChange={(open) => setExpandedSections({ ...expandedSections, displayNameMatch: open })}
                    >
                      <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-md hover:bg-muted transition-colors">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium">일치</span>
                          <span className="text-sm text-muted-foreground">
                            ({analysis.matches.displayName.count}건)
                          </span>
                        </div>
                        {expandedSections.displayNameMatch ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2">
                        {analysis.matches.displayName.details.length > 0 ? (
                          <div className="border rounded-md overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-[150px]">이메일</TableHead>
                                  <TableHead>현재 값</TableHead>
                                  <TableHead className="bg-blue-50 dark:bg-blue-950">분리 후 이름</TableHead>
                                  <TableHead className="bg-blue-50 dark:bg-blue-950">분리 후 직급</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {analysis.matches.displayName.details.map((detail, idx) => (
                                  <TableRow key={idx}>
                                    <TableCell className="font-medium">{detail.email || detail.uid}</TableCell>
                                    <TableCell>{detail.value || '(없음)'}</TableCell>
                                    <TableCell className="bg-blue-50 dark:bg-blue-950 font-semibold">{detail.suggestedName || '-'}</TableCell>
                                    <TableCell className="bg-blue-50 dark:bg-blue-950">{detail.suggestedPosition || '-'}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground p-2">일치 항목이 없습니다.</div>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  </div>

                  {/* email */}
                  <div className="border rounded-md p-4 space-y-2">
                    <h4 className="font-semibold text-sm">email</h4>
                    
                    {/* 불일치 */}
                    <Collapsible
                      open={expandedSections.email}
                      onOpenChange={(open) => setExpandedSections({ ...expandedSections, email: open })}
                    >
                      <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-md hover:bg-muted transition-colors">
                        <div className="flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-destructive" />
                          <span className="text-sm font-medium">불일치</span>
                          <span className="text-sm text-muted-foreground">
                            ({analysis.mismatches.email.count}건)
                          </span>
                        </div>
                        {expandedSections.email ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2">
                        {analysis.mismatches.email.details.length > 0 ? (
                          <div className="border rounded-md overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-[150px]">UID</TableHead>
                                  <TableHead>Firestore Email</TableHead>
                                  <TableHead>Firebase Auth Email</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {analysis.mismatches.email.details.map((detail, idx) => (
                                  <TableRow key={idx}>
                                    <TableCell className="font-medium text-xs">{detail.uid}</TableCell>
                                    <TableCell>{detail.firestoreEmail || '(없음)'}</TableCell>
                                    <TableCell>{detail.authEmail || '(없음)'}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground p-2">불일치 항목이 없습니다.</div>
                        )}
                      </CollapsibleContent>
                    </Collapsible>

                    {/* 일치 */}
                    <Collapsible
                      open={expandedSections.emailMatch}
                      onOpenChange={(open) => setExpandedSections({ ...expandedSections, emailMatch: open })}
                    >
                      <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-md hover:bg-muted transition-colors">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium">일치</span>
                          <span className="text-sm text-muted-foreground">
                            ({analysis.matches.email.count}건)
                          </span>
                        </div>
                        {expandedSections.emailMatch ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2">
                        {analysis.matches.email.details.length > 0 ? (
                          <div className="border rounded-md overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-[150px]">UID</TableHead>
                                  <TableHead>Email</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {analysis.matches.email.details.map((detail, idx) => (
                                  <TableRow key={idx}>
                                    <TableCell className="font-medium text-xs">{detail.uid}</TableCell>
                                    <TableCell>{detail.email || '(없음)'}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground p-2">일치 항목이 없습니다.</div>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  </div>

                  {/* photoURL */}
                  <div className="border rounded-md p-4 space-y-2">
                    <h4 className="font-semibold text-sm">photoURL</h4>
                    
                    {/* 불일치 */}
                    <Collapsible
                      open={expandedSections.photoURL}
                      onOpenChange={(open) => setExpandedSections({ ...expandedSections, photoURL: open })}
                    >
                      <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-md hover:bg-muted transition-colors">
                        <div className="flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-destructive" />
                          <span className="text-sm font-medium">불일치</span>
                          <span className="text-sm text-muted-foreground">
                            ({analysis.mismatches.photoURL.count}건)
                          </span>
                        </div>
                        {expandedSections.photoURL ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2">
                        {analysis.mismatches.photoURL.details.length > 0 ? (
                          <div className="border rounded-md overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-[150px]">이메일</TableHead>
                                  <TableHead>Firestore</TableHead>
                                  <TableHead>Firebase Auth</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {analysis.mismatches.photoURL.details.map((detail, idx) => (
                                  <TableRow key={idx}>
                                    <TableCell className="font-medium">{detail.email || detail.uid}</TableCell>
                                    <TableCell className="text-xs break-all">{detail.firestore || '(없음)'}</TableCell>
                                    <TableCell className="text-xs break-all">{detail.auth || '(없음)'}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground p-2">불일치 항목이 없습니다.</div>
                        )}
                      </CollapsibleContent>
                    </Collapsible>

                    {/* 일치 */}
                    <Collapsible
                      open={expandedSections.photoURLMatch}
                      onOpenChange={(open) => setExpandedSections({ ...expandedSections, photoURLMatch: open })}
                    >
                      <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-md hover:bg-muted transition-colors">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium">일치</span>
                          <span className="text-sm text-muted-foreground">
                            ({analysis.matches.photoURL.count}건)
                          </span>
                        </div>
                        {expandedSections.photoURLMatch ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2">
                        {analysis.matches.photoURL.details.length > 0 ? (
                          <div className="border rounded-md overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-[150px]">이메일</TableHead>
                                  <TableHead>URL</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {analysis.matches.photoURL.details.map((detail, idx) => (
                                  <TableRow key={idx}>
                                    <TableCell className="font-medium">{detail.email || detail.uid}</TableCell>
                                    <TableCell className="text-xs break-all">{detail.value || '(없음)'}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground p-2">일치 항목이 없습니다.</div>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  </div>

                  {/* phoneNumber */}
                  <div className="border rounded-md p-4 space-y-2">
                    <h4 className="font-semibold text-sm">phoneNumber</h4>
                    
                    {/* 불일치 */}
                    <Collapsible
                      open={expandedSections.phoneNumber}
                      onOpenChange={(open) => setExpandedSections({ ...expandedSections, phoneNumber: open })}
                    >
                      <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-md hover:bg-muted transition-colors">
                        <div className="flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-destructive" />
                          <span className="text-sm font-medium">불일치</span>
                          <span className="text-sm text-muted-foreground">
                            ({analysis.mismatches.phoneNumber.count}건)
                          </span>
                        </div>
                        {expandedSections.phoneNumber ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2">
                        {analysis.mismatches.phoneNumber.details.length > 0 ? (
                          <div className="border rounded-md overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-[150px]">이메일</TableHead>
                                  <TableHead>Firestore (contact)</TableHead>
                                  <TableHead>Firebase Auth (phoneNumber)</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {analysis.mismatches.phoneNumber.details.map((detail, idx) => (
                                  <TableRow key={idx}>
                                    <TableCell className="font-medium">{detail.email || detail.uid}</TableCell>
                                    <TableCell>{detail.firestore || '(없음)'}</TableCell>
                                    <TableCell>{detail.auth || '(없음)'}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground p-2">불일치 항목이 없습니다.</div>
                        )}
                      </CollapsibleContent>
                    </Collapsible>

                    {/* 일치 */}
                    <Collapsible
                      open={expandedSections.phoneNumberMatch}
                      onOpenChange={(open) => setExpandedSections({ ...expandedSections, phoneNumberMatch: open })}
                    >
                      <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-md hover:bg-muted transition-colors">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium">일치</span>
                          <span className="text-sm text-muted-foreground">
                            ({analysis.matches.phoneNumber.count}건)
                          </span>
                        </div>
                        {expandedSections.phoneNumberMatch ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2">
                        {analysis.matches.phoneNumber.details.length > 0 ? (
                          <div className="border rounded-md overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-[150px]">이메일</TableHead>
                                  <TableHead>전화번호</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {analysis.matches.phoneNumber.details.map((detail, idx) => (
                                  <TableRow key={idx}>
                                    <TableCell className="font-medium">{detail.email || detail.uid}</TableCell>
                                    <TableCell>{detail.value || '(없음)'}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground p-2">일치 항목이 없습니다.</div>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                </div>

                {/* Firestore에 없는 Auth 사용자 */}
                {analysis.missingInFirestore.length > 0 && (
                  <Collapsible
                    open={expandedSections.missingInFirestore}
                    onOpenChange={(open) => setExpandedSections({ ...expandedSections, missingInFirestore: open })}
                  >
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="flex items-center justify-between w-full">
                        <span>
                          Firestore에 없는 Auth 사용자: {analysis.missingInFirestore.length}명
                        </span>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 px-2">
                            {expandedSections.missingInFirestore ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                      </AlertDescription>
                    </Alert>
                    <CollapsibleContent className="mt-2 space-y-2">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const deleteTargets = analysis.missingInFirestore
                              .filter(u => u.shouldDelete)
                              .map(u => u.uid);
                            setSelectedDeleteUids(deleteTargets);
                          }}
                        >
                          삭제 대상만 선택
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedDeleteUids([])}
                        >
                          선택 해제
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={selectedDeleteUids.length === 0 || isDeleting}
                          onClick={() => handleDelete(true)}
                        >
                          삭제 시뮬레이션 ({selectedDeleteUids.length}명)
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={selectedDeleteUids.length === 0 || isDeleting}
                          onClick={() => handleDelete(false)}
                        >
                          {isDeleting ? '삭제 중...' : `실제 삭제 (${selectedDeleteUids.length}명)`}
                        </Button>
                      </div>
                      <div className="border rounded-md overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[50px]">선택</TableHead>
                              <TableHead className="w-[150px]">UID</TableHead>
                              <TableHead>이메일</TableHead>
                              <TableHead>displayName</TableHead>
                              <TableHead>삭제 대상</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {analysis.missingInFirestore.map((user, idx) => (
                              <TableRow key={idx} className={user.shouldDelete ? 'bg-red-50 dark:bg-red-950/20' : ''}>
                                <TableCell>
                                  <input
                                    type="checkbox"
                                    checked={selectedDeleteUids.includes(user.uid)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedDeleteUids([...selectedDeleteUids, user.uid]);
                                      } else {
                                        setSelectedDeleteUids(selectedDeleteUids.filter(uid => uid !== user.uid));
                                      }
                                    }}
                                    className="w-4 h-4"
                                  />
                                </TableCell>
                                <TableCell className="font-medium text-xs">{user.uid}</TableCell>
                                <TableCell>{user.email || '(없음)'}</TableCell>
                                <TableCell>{user.authDisplayName || '(없음)'}</TableCell>
                                <TableCell>
                                  {user.shouldDelete && (
                                    <span className="text-xs px-2 py-1 bg-red-500 text-white rounded">삭제 예정</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {/* Firebase Auth에 없는 Firestore 사용자 */}
                {analysis.missingInAuth.length > 0 && (
                  <Collapsible
                    open={expandedSections.missingInAuth}
                    onOpenChange={(open) => setExpandedSections({ ...expandedSections, missingInAuth: open })}
                  >
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="flex items-center justify-between w-full">
                        <span>
                          Firebase Auth에 없는 Firestore 사용자: {analysis.missingInAuth.length}명
                        </span>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 px-2">
                            {expandedSections.missingInAuth ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                      </AlertDescription>
                    </Alert>
                    <CollapsibleContent className="mt-2">
                      <div className="border rounded-md overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[150px]">UID</TableHead>
                              <TableHead>이메일</TableHead>
                              <TableHead>displayName</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {analysis.missingInAuth.map((user, idx) => (
                              <TableRow key={idx}>
                                <TableCell className="font-medium text-xs">{user.uid}</TableCell>
                                <TableCell>{user.email || '(없음)'}</TableCell>
                                <TableCell>{user.displayName || '(없음)'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </CardContent>
            </Card>
          )}

          {deleteResults && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">삭제 결과</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">요청된 삭제</div>
                    <div className="text-2xl font-bold">{deleteResults.totalRequested}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">삭제 완료</div>
                    <div className="text-2xl font-bold text-green-600">{deleteResults.deleted}</div>
                  </div>
                </div>

                {deleteResults.errors.length > 0 && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-semibold mb-2">삭제 실패 ({deleteResults.errors.length}건)</div>
                      <div className="space-y-1 text-xs max-h-40 overflow-y-auto">
                        {deleteResults.errors.map((err, idx) => (
                          <div key={idx}>
                            {err.uid}: {err.error}
                          </div>
                        ))}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {results && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">마이그레이션 결과</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">총 사용자</div>
                    <div className="text-2xl font-bold">{results.totalUsers}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">처리된 사용자</div>
                    <div className="text-2xl font-bold">{results.processed}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">건너뛴 사용자</div>
                    <div className="text-2xl font-bold">{results.skipped}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">에러</div>
                    <div className="text-2xl font-bold text-destructive">{results.errors.length}</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Firebase Auth 업데이트</h4>
                    <div className="space-y-1 text-sm">
                      <div>displayName: {results.updated.auth.displayName}건</div>
                      <div>photoURL: {results.updated.auth.photoURL}건</div>
                      <div>phoneNumber: {results.updated.auth.phoneNumber}건</div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Firestore 업데이트</h4>
                    <div className="space-y-1 text-sm">
                      <div>displayName: {results.updated.firestore.displayName}건</div>
                      <div>photoURL: {results.updated.firestore.photoURL}건</div>
                      <div className="font-semibold text-blue-600 dark:text-blue-400">position: {results.updated.firestore.position}건</div>
                    </div>
                  </div>
                </div>

                {results.errors.length > 0 && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-semibold mb-2">에러 발생 ({results.errors.length}건)</div>
                      <div className="space-y-1 text-xs max-h-40 overflow-y-auto">
                        {results.errors.map((err, idx) => (
                          <div key={idx}>
                            {err.email || err.uid}: {err.error}
                          </div>
                        ))}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {removePhoneResults && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">phoneNumber 필드 삭제 결과</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">총 사용자</div>
                    <div className="text-2xl font-bold">{removePhoneResults.totalUsers}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">처리된 사용자</div>
                    <div className="text-2xl font-bold">{removePhoneResults.processed}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">삭제된 필드</div>
                    <div className="text-2xl font-bold text-green-600">{removePhoneResults.removed}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">건너뛴 사용자</div>
                    <div className="text-2xl font-bold">{removePhoneResults.skipped}</div>
                  </div>
                </div>

                {removePhoneResults.errors.length > 0 && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-semibold mb-2">에러 발생 ({removePhoneResults.errors.length}건)</div>
                      <div className="space-y-1 text-xs max-h-40 overflow-y-auto">
                        {removePhoneResults.errors.map((err, idx) => (
                          <div key={idx}>{err.error}</div>
                        ))}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

