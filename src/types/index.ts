export type Provider = 'anthropic' | 'google';

export interface GeneratedComponent {
  id: string;
  prompt: string;
  code: string;
  createdAt: Date;
}

export type StreamStatus = 'streaming' | 'done' | 'error';

export interface StreamingComponent {
  id: string;
  prompt: string;
  partialCode: string;
  status: StreamStatus;
  createdAt: Date;
}
