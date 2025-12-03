/**
 * 마크다운 렌더링 컴포넌트
 * 코드 하이라이팅 및 마크다운 문법 지원
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from '@/shared/lib/utils';
import { UrlPreview, extractUrls } from '@/features/workspace/components/UrlPreview';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  searchQuery?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className,
  searchQuery,
}) => {
  // 검색어 하이라이트를 위한 함수
  const highlightSearchQuery = (text: string) => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      return text;
    }

    const query = searchQuery.trim();
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) => {
      if (regex.test(part)) {
        return (
          <mark
            key={index}
            className="px-1 py-0.5 rounded bg-yellow-300/90 dark:bg-yellow-600/90"
          >
            {part}
          </mark>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className={cn('markdown-content prose prose-sm dark:prose-invert max-w-none', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // 코드 블록
          code({ node, inline, className: codeClassName, children, ...props }: any) {
            const match = /language-(\w+)/.exec(codeClassName || '');
            const language = match ? match[1] : '';
            const codeString = String(children).replace(/\n$/, '');

            if (!inline && language) {
              return (
                <div className="relative my-2 rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 bg-muted border-b border-border">
                    <span className="text-xs font-medium text-muted-foreground">{language}</span>
                  </div>
                  <SyntaxHighlighter
                    style={vscDarkPlus as any}
                    language={language}
                    PreTag="div"
                    className="!m-0 !rounded-none"
                    customStyle={{
                      margin: 0,
                      padding: '1rem',
                      borderRadius: 0,
                      fontSize: '0.875rem',
                      lineHeight: '1.5',
                    }}
                    {...props}
                  >
                    {codeString}
                  </SyntaxHighlighter>
                </div>
              );
            }

            // 인라인 코드
            return (
              <code
                className={cn(
                  'px-1.5 py-0.5 rounded bg-muted text-sm font-mono',
                  codeClassName
                )}
                {...props}
              >
                {children}
              </code>
            );
          },
          // 제목
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold mt-4 mb-2 first:mt-0">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-semibold mt-3 mb-2 first:mt-0">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold mt-2 mb-1 first:mt-0">{children}</h3>
          ),
          // 단락
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          // 리스트
          ul: ({ children }) => (
            <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>
          ),
          li: ({ children }) => <li className="ml-2">{children}</li>,
          // 링크
              a: ({ href, children }) => {
                // 외부 링크인 경우 미리보기 표시
                const isExternal = href && (href.startsWith('http://') || href.startsWith('https://'));
                return (
                  <>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {children}
                    </a>
                    {isExternal && href && (
                      <div className="mt-2">
                        <UrlPreview url={href} />
                      </div>
                    )}
                  </>
                );
              },
          // 강조
          strong: ({ children }) => (
            <strong className="font-semibold">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          // 밑줄 (HTML <u> 태그 지원)
          u: ({ children }) => <u className="underline">{children}</u>,
          // 인용
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-muted-foreground/30 pl-4 py-2 my-2 italic text-muted-foreground">
              {children}
            </blockquote>
          ),
          // 수평선
          hr: () => <hr className="my-4 border-border" />,
          // 테이블
          table: ({ children }) => (
            <div className="overflow-x-auto my-2">
              <table className="min-w-full border-collapse border border-border rounded-lg">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted">{children}</thead>
          ),
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => (
            <tr className="border-b border-border">{children}</tr>
          ),
          th: ({ children }) => (
            <th className="px-4 py-2 text-left font-semibold border border-border">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2 border border-border">{children}</td>
          ),
          // 이미지
          img: ({ src, alt }) => (
            <img
              src={src}
              alt={alt}
              className="max-w-full h-auto rounded-lg my-2"
              loading="lazy"
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
      
      {/* URL 미리보기 (마크다운 링크가 아닌 경우) */}
      {(() => {
        const urls = extractUrls(content);
        const uniqueUrls = Array.from(new Set(urls));
        // 마크다운 링크로 이미 처리된 URL 제외
        const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        const markdownLinks = new Set<string>();
        let match;
        while ((match = markdownLinkRegex.exec(content)) !== null) {
          markdownLinks.add(match[2]);
        }
        const previewUrls = uniqueUrls.filter(url => !markdownLinks.has(url));
        
        return previewUrls.length > 0 ? (
          <div className="mt-2 space-y-2">
            {previewUrls.map((url, index) => (
              <UrlPreview key={`${url}-${index}`} url={url} />
            ))}
          </div>
        ) : null;
      })()}
    </div>
  );
};

