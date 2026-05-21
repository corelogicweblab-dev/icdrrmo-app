export type AiLanguage = 'en' | 'fil' | 'ceb' | 'cbk';

export type AiChatRequest = {
  message: string;
  language?: AiLanguage;
  conversationId?: string;
};

export type AiChatResponse = {
  reply: string;
  language: AiLanguage;
  engine: 'gemini' | 'context-rag';
  conversationId: string;
  suggestedActions?: string[];
};

export type AiRoleContext = {
  role: string;
  generatedAt: string;
  summary: string;
  incidents?: unknown[];
  weather?: unknown;
  evacuation?: unknown[];
  advisories?: unknown[];
  governance?: unknown;
  resources?: unknown;
  metrics?: unknown;
  citizenEngagement?: unknown;
};
