import { useState, useRef } from 'react';
import type { GeneratedComponent } from '../types';
import { LivePreview } from './LivePreview';
import { CodeView } from './CodeView';

interface ComponentCardProps {
  component: GeneratedComponent;
  onRemove: (id: string) => void;
  onRegenerate: (prompt: string) => void;
  onRefine: (id: string, instruction: string) => void;
  isLoading: boolean;
  isRefining: boolean;
}

type Tab = 'preview' | 'code';

export function ComponentCard({ component, onRemove, onRegenerate, onRefine, isLoading, isRefining }: ComponentCardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('preview');
  const [previewKey, setPreviewKey] = useState(0);
  const [showRefinePanel, setShowRefinePanel] = useState(false);
  const [instruction, setInstruction] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const createdAt = component.createdAt.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleToggleRefinePanel = () => {
    setShowRefinePanel((prev) => {
      if (!prev) setTimeout(() => textareaRef.current?.focus(), 0);
      return !prev;
    });
  };

  const handleRefineSubmit = () => {
    const trimmed = instruction.trim();
    if (!trimmed || isRefining) return;
    onRefine(component.id, trimmed);
    setInstruction('');
    setShowRefinePanel(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleRefineSubmit();
    }
    if (e.key === 'Escape') {
      setShowRefinePanel(false);
    }
  };

  const isBusy = isLoading || isRefining;

  return (
    <div className="component-card">
      <div className="card-header">
        <div className="card-title-group">
          <span>{createdAt}</span>
          <p className="card-prompt">{component.prompt}</p>
        </div>
        <div className="card-actions">
          <button
            className="btn-refresh"
            onClick={() => setPreviewKey((k) => k + 1)}
            title="미리보기 새로고침"
            aria-label="미리보기 새로고침"
          >
            ↻
          </button>
          <button
            className="btn-refine"
            onClick={handleToggleRefinePanel}
            disabled={isBusy}
            title="수정 지시로 재생성"
          >
            {isRefining ? '수정 중...' : '수정'}
          </button>
          <button
            className="btn-regenerate"
            onClick={() => onRegenerate(component.prompt)}
            disabled={isBusy}
          >
            재생성
          </button>
          <button
            className="btn-remove"
            onClick={() => onRemove(component.id)}
          >
            삭제
          </button>
        </div>
      </div>

      {showRefinePanel && (
        <div className="refine-panel">
          <textarea
            ref={textareaRef}
            className="refine-input"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="수정 지시를 입력하세요 (예: 버튼 색상을 파란색으로 변경해줘)"
            rows={2}
          />
          <div className="refine-actions">
            <span className="refine-hint">Ctrl+Enter로 제출, Esc로 닫기</span>
            <button
              className="btn-refine-cancel"
              onClick={() => setShowRefinePanel(false)}
            >
              취소
            </button>
            <button
              className="btn-refine-submit"
              onClick={handleRefineSubmit}
              disabled={!instruction.trim() || isRefining}
            >
              적용
            </button>
          </div>
        </div>
      )}

      <div className="card-tabs">
        <button
          className={`tab ${activeTab === 'preview' ? 'tab--active' : ''}`}
          onClick={() => setActiveTab('preview')}
        >
          미리보기
        </button>
        <button
          className={`tab ${activeTab === 'code' ? 'tab--active' : ''}`}
          onClick={() => setActiveTab('code')}
        >
          코드
        </button>
      </div>
      <div className="card-content">
        {isRefining ? (
          <div className="refining-overlay">
            <div className="loading-pulse" />
            <p>수정된 컴포넌트를 생성하고 있습니다...</p>
          </div>
        ) : activeTab === 'preview' ? (
          <LivePreview key={previewKey} code={component.code} />
        ) : (
          <CodeView code={component.code} />
        )}
      </div>
    </div>
  );
}
