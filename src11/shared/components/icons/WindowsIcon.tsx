import React from 'react';

interface WindowsIconProps {
  className?: string;
  size?: number;
}

export const WindowsIcon: React.FC<WindowsIconProps> = ({ 
  className = '', 
  size = 20 
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Windows 로고: 4개의 정사각형 */}
      <path d="M3 3h8v8H3V3z" />
      <path d="M13 3h8v8h-8V3z" />
      <path d="M3 13h8v8H3v-8z" />
      <path d="M13 13h8v8h-8v-8z" />
    </svg>
  );
};

