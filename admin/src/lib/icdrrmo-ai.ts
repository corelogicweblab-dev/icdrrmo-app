import { fetchWithTimeout } from "@/lib/api-fetch";
import { getApiBaseUrl } from "@/lib/env";
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

/** Public portal chat (home page, no sign-in). */
export async function sendGuestAiChat(
  message: string,
  opts?: { language?: AiLanguage; conversationId?: string },
): Promise<AiChatResponse> {
  const url = `${getApiBaseUrl()}/ai/guest-chat`;
  const res = await fetchWithTimeout(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      language: opts?.language,
      conversationId: opts?.conversationId,
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(text || `HTTP ${res.status}`);
  }
  return JSON.parse(text) as AiChatResponse;
}
