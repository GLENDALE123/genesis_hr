/*
  로깅 및 모니터링 유틸리티
*/

// 구조화된 로깅
function logNotificationEvent(event, data = {}) {
  const logData = {
    timestamp: new Date().toISOString(),
    event,
    ...data
  };
  
  console.log(`[NOTIFICATION_${event.toUpperCase()}]`, JSON.stringify(logData));
}

// 성능 메트릭 수집
function createPerformanceTimer(label) {
  const start = Date.now();
  
  return {
    end: (extraData = {}) => {
      const duration = Date.now() - start;
      logNotificationEvent('performance', {
        label,
        duration,
        ...extraData
      });
      return duration;
    }
  };
}

// 에러 로깅 (구조화 및 분류)
function logError(context, error, extraData = {}) {
  const errorData = {
    context,
    error: error?.message || String(error),
    stack: error?.stack,
    errorCode: error?.code,
    errorDetails: error?.details,
    timestamp: new Date().toISOString(),
    ...extraData
  };
  
  // 에러 심각도 분류
  const severity = classifyErrorSeverity(error);
  errorData.severity = severity;
  
  console.error(`[NOTIFICATION_ERROR_${context.toUpperCase()}_${severity}]`, JSON.stringify(errorData));
  
  // 심각한 에러의 경우 추가 알림 (필요시)
  if (severity === 'critical') {
    logCriticalError(context, errorData);
  }
}

// 에러 심각도 분류
function classifyErrorSeverity(error) {
  if (!error) return 'unknown';
  
  const errorMessage = error?.message || String(error);
  const errorCode = error?.code || '';
  
  // FCM 관련 에러
  if (errorCode.includes('messaging/') || errorMessage.includes('FCM')) {
    if (errorCode.includes('invalid-argument') || errorCode.includes('registration-token-not-registered')) {
      return 'warning'; // 토큰 관련 에러는 경고
    }
    return 'error';
  }
  
  // 데이터베이스 관련 에러
  if (errorCode.includes('firestore/') || errorMessage.includes('Firestore')) {
    return 'critical';
  }
  
  // 네트워크 관련 에러
  if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
    return 'error';
  }
  
  // 권한 관련 에러
  if (errorCode.includes('permission') || errorMessage.includes('permission')) {
    return 'critical';
  }
  
  return 'error';
}

// 심각한 에러 로깅
function logCriticalError(context, errorData) {
  console.error(`[CRITICAL_ERROR_${context.toUpperCase()}]`, JSON.stringify({
    ...errorData,
    alert: 'CRITICAL_ERROR_DETECTED',
    requiresAttention: true
  }));
}

// 알림 통계 수집 (상세화)
function logNotificationStats(stats) {
  const enhancedStats = {
    type: 'notification_summary',
    timestamp: new Date().toISOString(),
    ...stats
  };
  
  // 성공률 계산
  if (stats.totalSent && stats.totalSent > 0) {
    enhancedStats.successRate = ((stats.successCount || 0) / stats.totalSent * 100).toFixed(2) + '%';
  }
  
  // 재시도율 계산
  if (stats.retriedCount && stats.totalSent) {
    enhancedStats.retryRate = ((stats.retriedCount / stats.totalSent) * 100).toFixed(2) + '%';
  }
  
  logNotificationEvent('stats', enhancedStats);
}

// 알림 성능 메트릭 수집
function logNotificationMetrics(metrics) {
  const enhancedMetrics = {
    type: 'notification_performance',
    timestamp: new Date().toISOString(),
    ...metrics
  };
  
  // 처리 시간 분류
  if (metrics.duration) {
    if (metrics.duration < 1000) {
      enhancedMetrics.performanceLevel = 'excellent';
    } else if (metrics.duration < 3000) {
      enhancedMetrics.performanceLevel = 'good';
    } else if (metrics.duration < 5000) {
      enhancedMetrics.performanceLevel = 'fair';
    } else {
      enhancedMetrics.performanceLevel = 'poor';
    }
  }
  
  logNotificationEvent('metrics', enhancedMetrics);
}

// 알림 타입별 통계
function logNotificationTypeStats(typeStats) {
  logNotificationEvent('type_stats', {
    type: 'notification_type_analysis',
    timestamp: new Date().toISOString(),
    stats: typeStats
  });
}

module.exports = {
  logNotificationEvent,
  createPerformanceTimer,
  logError,
  logNotificationStats,
  logNotificationMetrics,
  logNotificationTypeStats
};

