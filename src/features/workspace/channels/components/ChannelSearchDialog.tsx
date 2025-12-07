/**
 * 채널 검색 다이얼로그
 * 슬랙/디스코드 스타일의 통합 검색
 */

import React, { useState, useEffect } from 'react';
import { ChannelSearchService, type SearchResult } from '../services/channelSearchService';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Search, MessageSquare, File, AtSign, Calendar } from 'lucide-react';
import { formatChatDateTime } from '@/features/chat/utils/dateFormat';
import { cn } from '@/shared/lib/utils';
import type { Channel } from '../types/channel.types';

export interface ChannelSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelId?: string;
  workspaceId?: string;
}

export const ChannelSearchDialog: React.FC<ChannelSearchDialogProps> = ({
  open,
  onOpenChange,
  channelId,
  workspaceId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState('messages');

  useEffect(() => {
    if (!open) {
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [open]);

  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      if (!workspaceId || !channelId) {
        setSearchResults([]);
        return;
      }
      const results = await ChannelSearchService.searchMessages(searchQuery, workspaceId, channelId, {
        limit: 50,
      });
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        handleSearch();
      } else {
        setSearchResults([]);
      }
    }, 300); // 디바운스

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleResultClick = (result: SearchResult) => {
    // 메시지로 스크롤 (구현 필요)
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>검색</DialogTitle>
          <DialogDescription>
            메시지, 파일, 사용자를 검색할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* 검색 입력 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="검색어를 입력하세요..."
              className="pl-10"
            />
          </div>

          {/* 검색 결과 */}
          {isSearching && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              검색 중...
            </div>
          )}

          {!isSearching && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              검색 결과가 없습니다.
            </div>
          )}

          {!isSearching && searchResults.length > 0 && (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {searchResults.map((result) => (
                <button
                  key={result.message.id}
                  onClick={() => handleResultClick(result)}
                  className="w-full text-left p-3 rounded-lg border hover:bg-accent transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <MessageSquare className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">
                          {result.message.sender.displayName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatChatDateTime(result.message.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-foreground line-clamp-2">
                        {result.message.text}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};


