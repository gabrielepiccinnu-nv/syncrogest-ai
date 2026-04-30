import type { SyncrogestToolName } from './tools';

export type AIEngine = 'claude' | 'deepseek';

export interface UserMessage {
  id: string;
  type: 'user-text';
  role: 'user';
  content: string;
  timestamp: Date;
}

export interface AIPreviewMessage {
  id: string;
  type: 'ai-preview';
  role: 'assistant';
  toolName: SyncrogestToolName;
  toolInput: Record<string, unknown>;
  humanSummary: string;
  timestamp: Date;
}

export interface AIResultMessage {
  id: string;
  type: 'ai-result';
  role: 'assistant';
  toolName: SyncrogestToolName;
  result: unknown;
  timestamp: Date;
}

export interface AITextMessage {
  id: string;
  type: 'ai-text';
  role: 'assistant';
  content: string;
  timestamp: Date;
}

export interface AIConfirmedMessage {
  id: string;
  type: 'ai-confirmed';
  role: 'assistant';
  toolName: SyncrogestToolName;
  timestamp: Date;
}

export interface AICancelledMessage {
  id: string;
  type: 'ai-cancelled';
  role: 'assistant';
  content: string;
  timestamp: Date;
}

export interface AIErrorMessage {
  id: string;
  type: 'ai-error';
  role: 'assistant';
  error: string;
  timestamp: Date;
}

export type ChatMessage =
  | UserMessage
  | AIPreviewMessage
  | AIConfirmedMessage
  | AIResultMessage
  | AITextMessage
  | AICancelledMessage
  | AIErrorMessage;

export interface ExecutedStep {
  toolName: string;
  toolInput: unknown;
  result: unknown;
}

export interface ChatApiResponse {
  type: 'preview' | 'text' | 'auto_executed' | 'error';
  toolName?: SyncrogestToolName;
  toolInput?: Record<string, unknown>;
  humanSummary?: string;
  text?: string;
  executedSteps?: ExecutedStep[];
  error?: string;
}

export interface ExecuteApiResponse {
  success: boolean;
  data?: unknown;
  interpretation?: string;
  error?: string;
}

export interface HistoryEntry {
  role: 'user' | 'assistant';
  content: string;
}
