import { fetchWithTimeout } from "@/lib/api-fetch";
import { getApiBaseUrl } from "@/lib/env";
import { OpsApiError } from "@/lib/ops-api";

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
  const url = `${getApiBaseUrl()}/ai/chat`;
  const res = await fetchWithTimeout(
    url,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        message,
        conversationId: opts?.conversationId,
      }),
    },
    22_000,
  );
  const text = await res.text();
  if (!res.ok) {
    throw new OpsApiError(`HTTP ${res.status}`, res.status, text);
  }
  return JSON.parse(text) as AiChatResponse;
}

/** Public portal chat (home page, no sign-in). */
export async function sendGuestAiChat(
  message: string,
  opts?: { language?: AiLanguage; conversationId?: string },
): Promise<AiChatResponse> {
  const url = `${getApiBaseUrl()}/ai/guest-chat`;
  const res = await fetchWithTimeout(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        conversationId: opts?.conversationId,
      }),
    },
    22_000,
  );
  const text = await res.text();
  if (!res.ok) {
    throw new OpsApiError(`HTTP ${res.status}`, res.status, text);
  }
  return JSON.parse(text) as AiChatResponse;
}
