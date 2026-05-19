import type { StreamingComponent } from '../types';

interface StreamingCardProps {
  component: StreamingComponent;
}

export function StreamingCard({ component }: StreamingCardProps) {
  return (
    <div className="component-card component-card--streaming">
      <div className="card-header">
        <div className="card-title-group">
          <p className="card-prompt">{component.prompt}</p>
        </div>
        {component.status === 'streaming' && (
          <div className="streaming-badge">생성 중...</div>
        )}
        {component.status === 'error' && (
          <div className="streaming-badge streaming-badge--error">오류</div>
        )}
      </div>
      <div className="card-content">
        <div className="code-panel">
          <div className="panel-header">
            <h3>코드</h3>
          </div>
          <pre className="code-block">
            <code>{component.partialCode}</code>
            {component.status === 'streaming' && (
              <span className="streaming-cursor" aria-hidden="true" />
            )}
          </pre>
        </div>
      </div>
    </div>
  );
}
