import React from 'react';
import { Card, CardContent } from '@/shared/components/ui/card';
import { AlertCircle } from 'lucide-react';

interface QualityIssueStatsCardsProps {
  stats: {
    total: number;
    unresolved: number;
    inProgress: number;
    resolved: number;
  };
  onFilterByStatus?: (status: string) => void;
}

export const QualityIssueStatsCards: React.FC<QualityIssueStatsCardsProps> = ({ stats, onFilterByStatus }) => {
  return (
    <div className="grid grid-cols-4 gap-2 md:gap-4">
      <Card 
        className={onFilterByStatus ? "cursor-pointer xl:hover:bg-muted/50 transition-colors" : ""}
        onClick={() => onFilterByStatus?.('')}
      >
         <CardContent className="p-3 md:p-6">
           {/* 모바일 레이아웃 */}
           <div className="flex flex-col items-center text-center md:hidden">
             <div className="flex items-center gap-1 mb-2">
               <p className="text-xs font-medium text-muted-foreground whitespace-nowrap">전체 이슈</p>
               <AlertCircle className="h-3 w-3 text-muted-foreground" />
             </div>
             <p className="text-lg font-bold">{stats.total}</p>
           </div>
           
           {/* 데스크톱 레이아웃 */}
           <div className="hidden md:flex items-center justify-between">
             <div>
               <p className="text-sm font-medium text-muted-foreground">전체 이슈</p>
               <p className="text-2xl font-bold">{stats.total}</p>
             </div>
             <AlertCircle className="h-8 w-8 text-muted-foreground" />
           </div>
         </CardContent>
      </Card>
      
      <Card 
        className={onFilterByStatus ? "cursor-pointer xl:hover:bg-muted/50 transition-colors" : ""}
        onClick={() => onFilterByStatus?.('미해결')}
      >
         <CardContent className="p-3 md:p-6">
           {/* 모바일 레이아웃 */}
           <div className="flex flex-col items-center text-center md:hidden">
             <div className="flex items-center gap-1 mb-2">
               <p className="text-xs font-medium text-muted-foreground whitespace-nowrap">미해결</p>
               <div className="h-3 w-3 rounded-full bg-red-100 flex items-center justify-center">
                 <AlertCircle className="h-2 w-2 text-red-600" />
               </div>
             </div>
             <p className="text-lg font-bold text-red-600">{stats.unresolved}</p>
           </div>
           
           {/* 데스크톱 레이아웃 */}
           <div className="hidden md:flex items-center justify-between">
             <div>
               <p className="text-sm font-medium text-muted-foreground">미해결</p>
               <p className="text-2xl font-bold text-red-600">{stats.unresolved}</p>
             </div>
             <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
               <AlertCircle className="h-4 w-4 text-red-600" />
             </div>
           </div>
         </CardContent>
      </Card>
      
      <Card 
        className={onFilterByStatus ? "cursor-pointer xl:hover:bg-muted/50 transition-colors" : ""}
        onClick={() => onFilterByStatus?.('진행중')}
      >
         <CardContent className="p-3 md:p-6">
           {/* 모바일 레이아웃 */}
           <div className="flex flex-col items-center text-center md:hidden">
             <div className="flex items-center gap-1 mb-2">
               <p className="text-xs font-medium text-muted-foreground whitespace-nowrap">진행중</p>
               <div className="h-3 w-3 rounded-full bg-yellow-100 flex items-center justify-center">
                 <AlertCircle className="h-2 w-2 text-yellow-600" />
               </div>
             </div>
             <p className="text-lg font-bold text-yellow-600">{stats.inProgress}</p>
           </div>
           
           {/* 데스크톱 레이아웃 */}
           <div className="hidden md:flex items-center justify-between">
             <div>
               <p className="text-sm font-medium text-muted-foreground">진행중</p>
               <p className="text-2xl font-bold text-yellow-600">{stats.inProgress}</p>
             </div>
             <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
               <AlertCircle className="h-4 w-4 text-yellow-600" />
             </div>
           </div>
         </CardContent>
      </Card>
      
      <Card 
        className={onFilterByStatus ? "cursor-pointer xl:hover:bg-muted/50 transition-colors" : ""}
        onClick={() => onFilterByStatus?.('해결완료')}
      >
         <CardContent className="p-3 md:p-6">
           {/* 모바일 레이아웃 */}
           <div className="flex flex-col items-center text-center md:hidden">
             <div className="flex items-center gap-1 mb-2">
               <p className="text-xs font-medium text-muted-foreground whitespace-nowrap">해결완료</p>
               <div className="h-3 w-3 rounded-full bg-green-100 flex items-center justify-center">
                 <AlertCircle className="h-2 w-2 text-green-600" />
               </div>
             </div>
             <p className="text-lg font-bold text-green-600">{stats.resolved}</p>
           </div>
           
           {/* 데스크톱 레이아웃 */}
           <div className="hidden md:flex items-center justify-between">
             <div>
               <p className="text-sm font-medium text-muted-foreground">해결완료</p>
               <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
             </div>
             <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
               <AlertCircle className="h-4 w-4 text-green-600" />
             </div>
           </div>
         </CardContent>
      </Card>
    </div>
  );
};

