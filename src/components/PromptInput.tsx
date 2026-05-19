import { useState } from 'react';

interface PromptInputProps {
  onGenerate: (prompt: string) => void;
  isLoading: boolean;
  promptHistory?: string[];
}

const EXAMPLES = [
  'SaaS 관리자용 KPI 카드 3개. 매출, 활성 사용자, 전환율을 비교 가능한 형태로 표시',
  '설정 페이지의 알림 토글 패널. 이메일, 슬랙, 주간 리포트 옵션 포함',
  '검색 필터 바. 상태, 담당자, 날짜 범위를 선택하고 결과 수를 보여주는 UI',
  '온보딩 체크리스트. 5단계 진행률과 완료/대기 상태를 보여주는 카드',
  '요금제 비교 카드 3개. 추천 플랜을 강조하고 CTA 버튼 포함',
  '테이블 행 상세보기 패널. 선택한 고객의 기본 정보와 최근 활동 표시',
];

export function PromptInput({ onGenerate, isLoading, promptHistory }: PromptInputProps) {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isLoading) {
      onGenerate(prompt.trim());
    }
  };

  const handleExampleClick = (example: string) => {
    setPrompt(example);
  };

  return (
    <div className="prompt-section">
      <div className="prompt-heading">
        <span className="panel-kicker">Prompt</span>
        <h2>무엇을 만들까요?</h2>
      </div>
      <form onSubmit={handleSubmit} className="prompt-form">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="예: 고객 목록 테이블 위에 들어갈 검색 필터 바를 만들어줘. 상태, 담당자, 날짜 범위 필터가 필요해."
          className="prompt-textarea"
          rows={3}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              handleSubmit(e);
            }
          }}
        />
        <button
          type="submit"
          className="btn-generate"
          disabled={!prompt.trim() || isLoading}
        >
          {isLoading ? (
            <span className="loading-spinner">생성 중...</span>
          ) : (
            '컴포넌트 생성'
          )}
        </button>
      </form>
      {promptHistory && promptHistory.length > 0 && (
        <div style={{ marginTop: '12px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            최근 사용
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
            {promptHistory.slice(0, 5).map((p, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPrompt(p)}
                style={{
                  textAlign: 'left',
                  padding: '6px 10px',
                  background: 'var(--surface)',
                  border: '1px solid color-mix(in srgb, var(--text) 12%, transparent)',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: 'var(--text-soft)',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  transition: 'border-color 0.16s ease, color 0.16s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--primary)';
                  e.currentTarget.style.color = 'var(--text)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--text) 12%, transparent)';
                  e.currentTarget.style.color = 'var(--text-soft)';
                }}
              >
                {p.length > 60 ? `${p.slice(0, 60)}...` : p}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="prompt-examples">
        <span className="examples-label">예시 프롬프트</span>
        {EXAMPLES.map((example) => (
          <button
            key={example}
            className="example-chip"
            onClick={() => handleExampleClick(example)}
            type="button"
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  );
}
