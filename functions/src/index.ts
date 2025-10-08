import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Firebase Admin SDK 초기화
admin.initializeApp();

// 사용자 생성 시 자동으로 사용자 문서 생성
export const createUserDocument = functions.auth.user().onCreate(async (user) => {
  try {
    await admin.firestore().collection('users').doc(user.uid).set({
      email: user.email,
      displayName: user.displayName || '',
      role: 'employee', // 기본 역할
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    console.log(`사용자 문서 생성됨: ${user.uid}`);
  } catch (error) {
    console.error('사용자 문서 생성 실패:', error);
  }
});

// 사용자 삭제 시 관련 데이터 정리
export const deleteUserData = functions.auth.user().onDelete(async (user) => {
  try {
    const batch = admin.firestore().batch();
    
    // 사용자 문서 삭제
    batch.delete(admin.firestore().collection('users').doc(user.uid));
    
    // 사용자별 파일 삭제 (Storage)
    const bucket = admin.storage().bucket();
    const [files] = await bucket.getFiles({ prefix: `users/${user.uid}/` });
    
    await Promise.all(files.map(file => file.delete()));
    
    await batch.commit();
    console.log(`사용자 데이터 삭제됨: ${user.uid}`);
  } catch (error) {
    console.error('사용자 데이터 삭제 실패:', error);
  }
});

// 급여 계산 함수
export const calculatePayroll = functions.https.onCall(async (data, context) => {
  // 인증 확인
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', '인증이 필요합니다.');
  }
  
  try {
    const { baseSalary, overtimeHours, bonus } = data;
    
    // 기본 급여 계산
    const hourlyRate = baseSalary / 160; // 월 160시간 기준
    const overtimePay = overtimeHours * hourlyRate * 1.5;
    const totalPay = baseSalary + overtimePay + (bonus || 0);
    
    // 세금 계산 (간단한 예시)
    const tax = totalPay * 0.1; // 10% 세금
    const netPay = totalPay - tax;
    
    return {
      baseSalary,
      overtimeHours,
      overtimePay,
      bonus: bonus || 0,
      totalPay,
      tax,
      netPay,
      calculatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
  } catch (error) {
    console.error('급여 계산 실패:', error);
    throw new functions.https.HttpsError('internal', '급여 계산 중 오류가 발생했습니다.');
  }
});

// 직원 통계 함수
export const getEmployeeStats = functions.https.onCall(async (data, context) => {
  // 인증 확인
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', '인증이 필요합니다.');
  }
  
  try {
    const employeesSnapshot = await admin.firestore().collection('employees').get();
    const employees = employeesSnapshot.docs.map(doc => doc.data());
    
    const stats = {
      totalEmployees: employees.length,
      departments: {} as Record<string, number>,
      averageAge: 0,
      totalSalary: 0,
    };
    
    let totalAge = 0;
    
    employees.forEach(employee => {
      // 부서별 통계
      const dept = employee.department || '기타';
      stats.departments[dept] = (stats.departments[dept] || 0) + 1;
      
      // 나이 통계
      if (employee.age) {
        totalAge += employee.age;
      }
      
      // 급여 통계
      if (employee.salary) {
        stats.totalSalary += employee.salary;
      }
    });
    
    stats.averageAge = employees.length > 0 ? totalAge / employees.length : 0;
    
    return stats;
  } catch (error) {
    console.error('직원 통계 조회 실패:', error);
    throw new functions.https.HttpsError('internal', '통계 조회 중 오류가 발생했습니다.');
  }
});

// 🔔 알림 생성 함수 (Tauri 앱에서 실시간 수신)
export const sendNotification = functions.https.onCall(async (data, context) => {
  // 인증 확인
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', '인증이 필요합니다.');
  }
  
  try {
    const { userId, title, body, type, link, metadata } = data;
    
    // 필수 필드 검증
    if (!userId || !title || !body) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'userId, title, body는 필수 필드입니다.'
      );
    }
    
    // Firestore에 알림 저장
    const notification = await admin.firestore().collection('notifications').add({
      userId,
      title,
      body,
      type: type || 'info',
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      link: link || null,
      metadata: metadata || null,
    });
    
    console.log(`알림 생성됨: ${notification.id} (대상: ${userId})`);
    
    return {
      success: true,
      notificationId: notification.id,
    };
  } catch (error) {
    console.error('알림 생성 실패:', error);
    throw new functions.https.HttpsError('internal', '알림 생성 중 오류가 발생했습니다.');
  }
});

// 🔔 생산 보고서 생성 시 자동 알림 (예시)
export const onProductionReportCreated = functions.firestore
  .document('productionReports/{reportId}')
  .onCreate(async (snapshot, context) => {
    try {
      const report = snapshot.data();
      
      // 관리자에게 알림 전송
      const managersSnapshot = await admin.firestore()
        .collection('users')
        .where('role', '==', 'manager')
        .get();
      
      const notifications = managersSnapshot.docs.map(doc => {
        return admin.firestore().collection('notifications').add({
          userId: doc.id,
          title: '새 생산 보고서',
          body: `${report.productName || '제품'}의 생산 보고서가 등록되었습니다.`,
          type: 'info',
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          link: `/production/daily-report/${context.params.reportId}`,
          metadata: {
            reportId: context.params.reportId,
            productName: report.productName,
          },
        });
      });
      
      await Promise.all(notifications);
      console.log(`생산 보고서 알림 전송 완료: ${context.params.reportId}`);
    } catch (error) {
      console.error('생산 보고서 알림 전송 실패:', error);
    }
  });

// 🔔 급여 계산 완료 시 자동 알림 (예시)
export const onPayrollCalculated = functions.firestore
  .document('payrolls/{payrollId}')
  .onCreate(async (snapshot, context) => {
    try {
      const payroll = snapshot.data();
      
      // 직원에게 알림 전송
      await admin.firestore().collection('notifications').add({
        userId: payroll.employeeId,
        title: '급여 계산 완료',
        body: `${payroll.month || '이번 달'} 급여가 계산되었습니다. 확인해주세요.`,
        type: 'success',
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        link: `/payroll/${context.params.payrollId}`,
        metadata: {
          payrollId: context.params.payrollId,
          month: payroll.month,
          amount: payroll.netPay,
        },
      });
      
      console.log(`급여 계산 알림 전송 완료: ${context.params.payrollId}`);
    } catch (error) {
      console.error('급여 계산 알림 전송 실패:', error);
    }
  });