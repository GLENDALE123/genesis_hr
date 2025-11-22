/**
 * 간단한 바 차트 컴포넌트
 * HS-Jig SimpleBarChart 참고
 */


import React from 'react';

interface SimpleBarChartProps {
  data: Array<{ label: string; value: number }>;
  colorClass: string;
}

export const SimpleBarChart: React.FC<SimpleBarChartProps> = ({
  data,
  colorClass
}) => {
  const maxValue = Math.max(...data.map(d => d.value), 1);

  return (
    <div className="space-y-2">
      {data.map(item => {
        const widthPercent = (item.value / maxValue) * 100;
        
        return (
          <div key={item.label} className="flex items-center text-sm">
            <div className="w-1/3 truncate pr-2 text-muted-foreground">
              {item.label}
            </div>
            <div className="w-2/3 flex items-center">
              <div className="w-full bg-muted rounded-full h-4">
                <div
                  className={`${colorClass} h-4 rounded-full transition-all`}
                  style={{ width: widthPercent + '%' }}
                />
              </div>
              <span className="ml-2 font-semibold">{item.value}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};



