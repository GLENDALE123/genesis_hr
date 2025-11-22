
import React from 'react';
import { JigRequest } from '../types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { STATUS_COLORS } from '../constants';
import { ImageGalleryGrid } from '@/shared/components/common/ImageGalleryGrid';

interface JigRequestCardProps {
  request: JigRequest;
  onSelect: (request: JigRequest) => void;
}

export const JigRequestCard: React.FC<JigRequestCardProps> = ({ request, onSelect }) => {
  return (
    <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => onSelect(request)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{request.itemName}</CardTitle>
          <Badge
            style={{
              backgroundColor: STATUS_COLORS[request.status],
              color: '#ffffff',
            }}
          >
            {request.status}
          </Badge>
        </div>
        <CardDescription className="text-sm text-muted-foreground">{request.partName} ({request.itemNumber})</CardDescription>
      </CardHeader>
      <CardContent className="text-sm space-y-2 pb-3">
        <p><strong>요청자:</strong> {request.requester}</p>
        <p><strong>수신처:</strong> {request.destination}</p>
        <p><strong>요청일:</strong> {new Date(request.requestDate).toLocaleDateString('ko-KR')}</p>
        <p><strong>납기일:</strong> {request.deliveryDate}</p>
        <p><strong>수량:</strong> {request.quantity.toLocaleString()} / {request.receivedQuantity.toLocaleString()}</p>
        {request.imageUrls && request.imageUrls.length > 0 && (
          <div className="mt-2">
            <ImageGalleryGrid images={request.imageUrls.slice(0, 1)} gridClassName="grid-cols-1" imageClassName="h-24" />
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-3 text-xs text-muted-foreground">
        <p className="truncate">특이사항: {request.remarks || '없음'}</p>
      </CardFooter>
    </Card>
  );
};


