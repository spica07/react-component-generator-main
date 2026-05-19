import { useState } from 'react';
import { LiveProvider, LivePreview as ReactLivePreview, LiveError } from 'react-live';

type Viewport = 'mobile' | 'tablet' | 'desktop';

const VIEWPORTS: { key: Viewport; label: string; width: number | null }[] = [
  { key: 'mobile', label: '모바일', width: 375 },
  { key: 'tablet', label: '태블릿', width: 768 },
  { key: 'desktop', label: '데스크탑', width: null },
];

interface LivePreviewProps {
  code: string;
}

export function LivePreview({ code }: LivePreviewProps) {
  const [viewport, setViewport] = useState<Viewport>('desktop');

  const current = VIEWPORTS.find((v) => v.key === viewport)!;

  return (
    <div className="preview-panel">
      <div className="panel-header">
        <h3>미리보기</h3>
        <div className="viewport-selector">
          {VIEWPORTS.map(({ key, label, width }) => (
            <button
              key={key}
              className={`viewport-btn${viewport === key ? ' viewport-btn--active' : ''}`}
              onClick={() => setViewport(key)}
              title={width ? `${width}px` : '데스크탑 (전체 너비)'}
            >
              {label}
              {width && <span className="viewport-size">{width}</span>}
            </button>
          ))}
        </div>
      </div>
      <div className="preview-content">
        <LiveProvider code={code} noInline>
          <div className="preview-render">
            <div
              className="preview-viewport-frame"
              style={current.width ? { maxWidth: current.width } : undefined}
            >
              <ReactLivePreview />
            </div>
          </div>
          <LiveError className="preview-error" />
        </LiveProvider>
      </div>
    </div>
  );
}
