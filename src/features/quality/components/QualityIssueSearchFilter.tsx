import React from 'react';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Search, Filter } from 'lucide-react';

interface QualityIssueSearchFilterProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

export const QualityIssueSearchFilter: React.FC<QualityIssueSearchFilterProps> = ({
  searchTerm,
  onSearchChange,
}) => {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="발주번호, 제품명, 부속명, 발주처, 작성자로 검색..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
          </div>
          <Button variant="outline" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            필터
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};


