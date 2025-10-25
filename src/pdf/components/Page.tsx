import React from 'react';
import { pageStyleA4 } from '../constants';

export function PdfPage({ children, className, style }: { children?: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`pdf-page bg-white relative ${className ?? ''}`} style={{ ...pageStyleA4, ...style }}>
      {children}
    </div>
  );
}

export default PdfPage;
