import React from 'react';
import { mmToPx, MARGENS_MM } from '../constants';

export function PdfHeader({ right }: { right?: string }) {
  return (
    <div className="absolute" style={{ left: mmToPx(MARGENS_MM.esq), top: mmToPx(10), right: mmToPx(MARGENS_MM.dir), height: mmToPx(22) }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <div style={{ fontFamily: 'Helvetica, Arial, sans-serif', fontSize: '28pt', fontWeight: 700 }}>PEPERAIO</div>
        <div style={{ fontFamily: 'Helvetica, Arial, sans-serif', fontSize: '16pt', fontStyle: 'italic' }}>Comunicação Visual</div>
        {right && (
          <div style={{ marginLeft: 'auto', fontSize: '11pt', fontWeight: 700, textAlign: 'right' }}>{right}</div>
        )}
      </div>
      <div style={{ marginTop: 6, height: 0, borderTop: '3px solid rgb(79,97,57)' }} />
      <div style={{ marginTop: 3, height: 0, borderTop: '3px solid rgb(182,75,58)' }} />
    </div>
  );
}

export default PdfHeader;
