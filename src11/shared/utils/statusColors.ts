/**
 * Status color utility for processing history components
 */

export interface StatusColorMap {
  [status: string]: string;
}

/**
 * Get status color with fallback support
 * @param status - The status string
 * @param colorMap - Optional custom color mapping
 * @returns CSS class name or inline style color
 */
export const getStatusColor = (status: string, colorMap?: StatusColorMap): string => {
  // Default color mapping
  const defaultColors: StatusColorMap = {
    '요청': 'bg-blue-100 text-blue-800',
    '승인': 'bg-green-100 text-green-800',
    '반려': 'bg-red-100 text-red-800',
    '완료': 'bg-gray-100 text-gray-800',
    '진행중': 'bg-yellow-100 text-yellow-800',
    '대기': 'bg-gray-100 text-gray-600',
    '처리중': 'bg-orange-100 text-orange-800',
    '보류': 'bg-purple-100 text-purple-800',
    '취소': 'bg-red-100 text-red-600',
    '승인완료': 'bg-green-100 text-green-800',
    '반려완료': 'bg-red-100 text-red-800',
    '입고완료': 'bg-green-100 text-green-800',
    '출고완료': 'bg-blue-100 text-blue-800',
    '검수완료': 'bg-green-100 text-green-800',
    '검수대기': 'bg-yellow-100 text-yellow-800',
    '검수반려': 'bg-red-100 text-red-800',
  };

  // Use custom color map if provided, otherwise use default
  const colors = colorMap || defaultColors;
  
  // Return color class or fallback
  return colors[status] || 'bg-gray-100 text-gray-600';
};

/**
 * Get status color class for Badge component
 * @param status - The status string
 * @param colorMap - Optional custom color mapping
 * @returns Badge variant or className
 */
export const getStatusColorClass = (status: string, colorMap?: StatusColorMap): string => {
  return getStatusColor(status, colorMap);
};

