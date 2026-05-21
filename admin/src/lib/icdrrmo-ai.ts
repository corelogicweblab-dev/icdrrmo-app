import { opsFetchJson } from "@/lib/ops-api";

export type AiLanguage = "en" | "fil" | "ceb" | "cbk";

export type AiChatResponse = {
  reply: string;
  language: AiLanguage;
  engine: "gemini" | "context-rag";
  conversationId: string;
  suggestedActions?: string[];
};

export async function sendAiChat(
  accessToken: string,
  message: string,
  opts?: { language?: AiLanguage; conversationId?: string },
): Promise<AiChatResponse> {
  return opsFetchJson<AiChatResponse>("/ai/chat", accessToken, {
    method: "POST",
    body: JSON.stringify({
      message,
      language: opts?.language,
      conversationId: opts?.conversationId,
    }),
  });
}
