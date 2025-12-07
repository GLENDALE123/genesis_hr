/**
 * 제품 목록 조회 훅
 * packaging-reports 및 quality-inspections 실시간 구독 및 중복 제거
 * 최신 사용지그, 최신 하도데이터, 최신 상도데이터 포함
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/shared/services/firebase/config';
import { PackagingReport } from '@/features/production/packaging';
import type { QualityInspection } from '@/features/quality/types';
import { Product } from '../types';
import { generateProductId } from '../services/productService';

export const useProducts = (limitCount: number = 2000) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // 메모리 누수 방지: useRef로 관리
  const updateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const packagingReportsRef = useRef<PackagingReport[]>([]);
  const qualityInspectionsRef = useRef<QualityInspection[]>([]);
  const isMountedRef = useRef(true);

  useEffect(() => {
    if (!db) {
      setError(new Error('Firebase not initialized'));
      setLoading(false);
      return;
    }

    isMountedRef.current = true;
    setLoading(true);
    setError(null);

    const packagingQuery = query(
      collection(db, 'packaging-reports'),
      orderBy('workDate', 'desc'),
      limit(limitCount)
    );

    const qualityQuery = query(
      collection(db, 'quality-inspections'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    let packagingUnsubscribe: (() => void) | null = null;
    let qualityUnsubscribe: (() => void) | null = null;

    const updateProducts = () => {
      // debounce: 짧은 시간 내 여러 업데이트가 발생하면 마지막 것만 처리
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
        updateTimerRef.current = null;
      }
      
      updateTimerRef.current = setTimeout(() => {
        // 컴포넌트가 언마운트된 경우 실행하지 않음
        if (!isMountedRef.current) {
          updateTimerRef.current = null;
          return;
        }
        
        try {
        // 제품 중복 제거 및 최신 정보 수집
        const productMap = new Map<string, {
          product: Product;
          latestJig?: string;
          latestJigDate?: string; // 최신 지그 정보의 날짜
          latestUndercoatData?: string;
          latestTopcoatData?: string;
          personnelCounts: number[]; // 평균작업인원 계산용
          latestLineRatio?: string; // 최근 비율(스핀들비율)
          rpmValues: number[]; // 평균 작업속도(RPM) 계산용
        }>();

        // packaging-reports에서 제품 정보 및 최신 도료 정보 수집
        packagingReportsRef.current.forEach(report => {
          if (!report.supplier || !report.partName || !report.specification) {
            return;
          }

          // 발주번호별로 제품 분리
          const orderNumbers = report.orderNumbers || [];
          const productNames = report.productName 
            ? report.productName.split(',').map(name => name.trim()).filter(Boolean)
            : [];

          // 발주번호와 제품명이 모두 있는 경우, 각 발주번호별로 제품 생성
          if (orderNumbers.length > 0 && productNames.length > 0) {
            // 발주번호와 제품명의 개수가 다를 수 있으므로, 최대 개수만큼 처리
            const maxLength = Math.max(orderNumbers.length, productNames.length);
            
            for (let i = 0; i < maxLength; i++) {
              const orderNumber = orderNumbers[i] || '';
              const productName = productNames[i] || productNames[0] || report.productName || '';
              
              if (!productName) continue;

              const productId = generateProductId(
                report.supplier,
                productName,
                report.partName,
                report.specification
              );

              if (!productMap.has(productId)) {
                productMap.set(productId, {
                  product: {
                    id: productId,
                    supplier: report.supplier,
                    productName: productName,
                    partName: report.partName,
                    specification: report.specification
                  },
                  personnelCounts: [],
                  rpmValues: []
                });
              }

              const productData = productMap.get(productId)!;
              
              // 최신 하도데이터 업데이트
              if (report.processConditions?.undercoat?.conditions && !productData.latestUndercoatData) {
                productData.latestUndercoatData = report.processConditions.undercoat.conditions;
              }

              // 최신 상도데이터 업데이트
              if (report.processConditions?.topcoat?.conditions && !productData.latestTopcoatData) {
                productData.latestTopcoatData = report.processConditions.topcoat.conditions;
              }

              // 평균작업인원 계산용 데이터 수집 (0도 유효한 값)
              if (typeof report.personnelCount === 'number' && report.personnelCount >= 0) {
                productData.personnelCounts.push(report.personnelCount);
              }

              // 최근 비율(스핀들비율) 업데이트 (가장 최근 데이터, 빈 문자열이 아닐 때만)
              if (!productData.latestLineRatio && report.lineRatio && report.lineRatio.trim() !== '') {
                productData.latestLineRatio = report.lineRatio.trim();
              }
            }
          } else {
            // 발주번호나 제품명이 없는 경우 기존 로직 사용
            if (!report.productName) {
              return;
            }

            const productId = generateProductId(
              report.supplier,
              report.productName,
              report.partName,
              report.specification
            );

            if (!productMap.has(productId)) {
              productMap.set(productId, {
                product: {
                  id: productId,
                  supplier: report.supplier,
                  productName: report.productName,
                  partName: report.partName,
                  specification: report.specification
                },
                personnelCounts: [],
                rpmValues: []
              });
            }

            const productData = productMap.get(productId)!;

            // 최신 하도데이터 업데이트
            if (report.processConditions?.undercoat?.conditions && !productData.latestUndercoatData) {
              productData.latestUndercoatData = report.processConditions.undercoat.conditions;
            }

            // 최신 상도데이터 업데이트
            if (report.processConditions?.topcoat?.conditions && !productData.latestTopcoatData) {
              productData.latestTopcoatData = report.processConditions.topcoat.conditions;
            }

            // 평균작업인원 계산용 데이터 수집 (0도 유효한 값)
            if (typeof report.personnelCount === 'number' && report.personnelCount >= 0) {
              productData.personnelCounts.push(report.personnelCount);
            }

            // 최근 비율(스핀들비율) 업데이트 (가장 최근 데이터, 빈 문자열이 아닐 때만)
            if (!productData.latestLineRatio && report.lineRatio && report.lineRatio.trim() !== '') {
              productData.latestLineRatio = report.lineRatio.trim();
            }
          }
        });

        // 각 제품별로 최신 지그 정보 및 평균 라인속도 수집 (getProductDetail과 동일한 로직)
        // 각 제품별로 해당하는 품질이력 찾기 (1차 + 2차 검색)
        productMap.forEach((productData, productId) => {
          const product = productData.product;
          
          // 1차: 발주처, 제품명, 부속명, 사양으로 매칭
          const primaryMatched = qualityInspectionsRef.current.filter((inspection: QualityInspection) => 
            inspection.supplier === product.supplier &&
            inspection.productName === product.productName &&
            inspection.partName === product.partName &&
            (inspection.specification || '') === product.specification
          );
          
          // 해당 제품과 일치하는 packaging-reports에서 발주번호 수집 (getProductDetail과 동일)
          const orderNumbersFromReports = new Set<string>();
          packagingReportsRef.current
            .filter(report => 
              report.supplier === product.supplier &&
              report.productName === product.productName &&
              report.partName === product.partName &&
              report.specification === product.specification
            )
            .forEach(report => {
              if (report.orderNumbers && report.orderNumbers.length > 0) {
                report.orderNumbers.forEach(orderNum => {
                  if (orderNum && orderNum.trim() !== '') {
                    orderNumbersFromReports.add(orderNum.trim());
                  }
                });
              }
            });
          
          // 2차: 발주번호로 매칭 (1차에서 찾지 못한 것만)
          const primaryOrderNumbers = new Set(primaryMatched.map((i: QualityInspection) => i.orderNumber));
          const secondaryMatched = qualityInspectionsRef.current.filter((inspection: QualityInspection) => {
            if (primaryOrderNumbers.has(inspection.orderNumber)) {
              return false;
            }
            // 발주번호가 여러 개일 수 있으므로 확인
            if (inspection.orderNumber) {
              const inspectionOrderNumbers = inspection.orderNumber
                .split(/[,\s]+/)
                .map((s: string) => s.trim())
                .filter((s: string) => s);
              return inspectionOrderNumbers.some((orderNum: string) => 
                orderNumbersFromReports.has(orderNum)
              );
            }
            return false;
          });
          
          // 1차 + 2차 결과 합치기
          const allMatched = [...primaryMatched, ...secondaryMatched];
          
          // 지그 정보가 있는 것들만 필터링하고 날짜순 정렬
          const jigInspections = allMatched
            .filter(inspection => 
              inspection.jigUsed ||
              inspection.jigUsed1 ||
              inspection.jigUsed2 ||
              inspection.internalJigLower ||
              inspection.internalJigUpper
            )
            .map(inspection => {
              let inspectionDate = inspection.inspectionDate || '';
              if (!inspectionDate && inspection.createdAt) {
                if (typeof inspection.createdAt === 'string') {
                  inspectionDate = inspection.createdAt;
                } else if (inspection.createdAt && typeof inspection.createdAt === 'object' && 'toISOString' in inspection.createdAt) {
                  inspectionDate = (inspection.createdAt as Date).toISOString();
                }
              }
              return { inspection, inspectionDate };
            })
            .sort((a, b) => {
              // 날짜가 없으면 뒤로
              if (!a.inspectionDate && !b.inspectionDate) return 0;
              if (!a.inspectionDate) return 1;
              if (!b.inspectionDate) return -1;
              return b.inspectionDate.localeCompare(a.inspectionDate);
            });
          
          // 최신 지그 정보 사용
          if (jigInspections.length > 0) {
            const latest = jigInspections[0];
            const jigInfo = [
              latest.inspection.jigUsed,
              latest.inspection.jigUsed1,
              latest.inspection.jigUsed2,
              latest.inspection.internalJigLower,
              latest.inspection.internalJigUpper
            ].filter(Boolean).join(', ');
            
            if (jigInfo) {
              productData.latestJig = jigInfo;
              if (latest.inspectionDate) {
                productData.latestJigDate = latest.inspectionDate;
              }
            }
          }
          
          // 평균 작업속도(RPM) 계산용 데이터 수집 (공정검사에서만)
          allMatched.forEach(inspection => {
            if (inspection.inspectionType === 'inProcess' && inspection.processLines && inspection.processLines.length > 0) {
              inspection.processLines.forEach((processLine: any) => {
                if (processLine.lineSpeed) {
                  const lineSpeedStr = String(processLine.lineSpeed).trim();
                  const cleanedSpeed = lineSpeedStr.replace(/[^\d.]/g, '');
                  const rpm = parseFloat(cleanedSpeed);
                  if (!isNaN(rpm) && rpm > 0) {
                    productData.rpmValues.push(rpm);
                  }
                }
              });
            }
          });
        });

        // Product 배열로 변환
        const productsArray = Array.from(productMap.values()).map(data => {
          // 평균작업인원 계산
          const averagePersonnelCount = data.personnelCounts.length > 0
            ? Math.round(data.personnelCounts.reduce((sum, count) => sum + count, 0) / data.personnelCounts.length * 10) / 10
            : undefined;

          // 평균 작업속도(RPM) 계산
          const averageRPM = data.rpmValues.length > 0
            ? Math.round(data.rpmValues.reduce((sum, rpm) => sum + rpm, 0) / data.rpmValues.length * 10) / 10
            : undefined;

          return {
            ...data.product,
            latestJig: data.latestJig,
            latestUndercoatData: data.latestUndercoatData,
            latestTopcoatData: data.latestTopcoatData,
            averagePersonnelCount,
            latestLineRatio: data.latestLineRatio,
            averageRPM
          };
        });

          if (isMountedRef.current) {
            setProducts(productsArray);
            setLoading(false);
          }
        } catch (err) {
          console.error('Error processing products:', err);
          if (isMountedRef.current) {
            setError(err as Error);
            setLoading(false);
          }
        }
        updateTimerRef.current = null;
      }, 100); // 100ms debounce
    };

    packagingUnsubscribe = onSnapshot(
      packagingQuery,
      (snapshot) => {
        if (!isMountedRef.current) return;
        
        packagingReportsRef.current = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as PackagingReport));
        updateProducts();
      },
      (err) => {
        if (!isMountedRef.current) return;
        
        console.error('Error in packaging reports subscription:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    qualityUnsubscribe = onSnapshot(
      qualityQuery,
      (snapshot) => {
        if (!isMountedRef.current) return;
        
        qualityInspectionsRef.current = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as QualityInspection));
        updateProducts();
      },
      (err) => {
        if (!isMountedRef.current) return;
        
        console.error('Error in quality inspections subscription:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => {
      isMountedRef.current = false;
      
      // 타이머 정리
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
        updateTimerRef.current = null;
      }
      
      // 구독 해제
      if (packagingUnsubscribe) {
        packagingUnsubscribe();
      }
      if (qualityUnsubscribe) {
        qualityUnsubscribe();
      }
      
      // 참조 정리 (가비지 컬렉션을 위해)
      packagingReportsRef.current = [];
      qualityInspectionsRef.current = [];
    };
  }, [limitCount]);

  // 메모이제이션: products 배열이 실제로 변경되었을 때만 참조 변경
  const memoizedProducts = useMemo(() => products, [products]);

  return { products: memoizedProducts, loading, error };
};

