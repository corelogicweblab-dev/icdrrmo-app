"use client";

import type { ReactElement } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, Loader2, MessageCircle, Send, X } from "lucide-react";
import { sendAiChat, sendGuestAiChat, type AiChatResponse } from "@/lib/icdrrmo-ai";
import { navigateAiAction, resolveAiChatActions } from "@/lib/ai-chat-actions";
import { OpsApiError, opsApiErrorUserMessage } from "@/lib/ops-api";
import { ApiTimeoutError, formatApiReachabilityError } from "@/lib/api-fetch";

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
  actionIds?: string[];
};

const INTRO =
  "HapIsabela! I am ICDRRMO AI — Isabela City DRRMO assistant. Ask about SOS, weather, evacuation, preparedness, or how to use this app.";

export function IcdrrmoAiChat(props: {
  accessToken: string | null;
  portal: "citizen" | "chairman" | "responder" | "ops" | "home";
  guestMode?: boolean;
}): ReactElement | null {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const introActions =
    props.portal === "citizen"
      ? ["sos", "map", "prepare"]
      : ["sign_in", "citizen_portal", "map"];
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", text: INTRO, actionIds: introActions },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => {
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
  }, []);

  useEffect(() => {
    if (open) scrollToEnd();
  }, [messages, open, busy, scrollToEnd]);

  const canChat = Boolean(props.accessToken) || props.guestMode;

  const onActionClick = useCallback(
    (actionIds: string[] | undefined) => {
      const actions = resolveAiChatActions(actionIds, props.portal);
      const first = actions[0];
      if (!first) return;
      setOpen(false);
      navigateAiAction(first, props.portal, router);
    },
    [props.portal, router],
  );

  const submit = useCallback(async () => {
    const text = input.trim();
    if (!text || !canChat || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text }]);
    setBusy(true);
    try {
      const res: AiChatResponse = props.accessToken
        ? await sendAiChat(props.accessToken, text, { conversationId })
        : await sendGuestAiChat(text, { conversationId });
      setConversationId(res.conversationId);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: res.reply?.trim() || "I could not generate a reply. Please try again.",
          actionIds: res.suggestedActions,
        },
      ]);
    } catch (e: unknown) {
      const err =
        e instanceof OpsApiError
          ? opsApiErrorUserMessage(e)
          : e instanceof ApiTimeoutError
            ? formatApiReachabilityError(e, "health")
            : e instanceof Error
              ? e.message
              : "AI is temporarily unavailable. Check your connection and try again.";
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: err,
          actionIds: props.accessToken
            ? ["sos", "map", "prepare"]
            : ["sign_in", "citizen_portal"],
        },
      ]);
    } finally {
      setBusy(false);
    }
  }, [input, props.accessToken, canChat, busy, conversationId]);

  if (!canChat) return null;

  return (
    <div
      className="fixed z-[180] flex flex-col items-end gap-2 pointer-events-none
        bottom-[max(1rem,env(safe-area-inset-bottom))]
        right-[max(1rem,env(safe-area-inset-right))]"
      data-portal={props.portal}
    >
      {open ? (
        <div
          className="pointer-events-auto mb-1 flex w-[min(calc(100vw-1.25rem),400px)] max-h-[min(88dvh,580px)] flex-col overflow-hidden rounded-2xl border border-orange-500/25 bg-[#0a0a0a]/98 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.9)] backdrop-blur-md"
          role="dialog"
          aria-label="AI Chat"
        >
          <header className="flex shrink-0 items-center justify-between gap-2 border-b border-orange-500/15 bg-gradient-to-r from-orange-950/60 to-rose-950/40 px-3 py-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <Bot className="h-4 w-4 shrink-0 text-orange-400" aria-hidden />
              <div className="min-w-0">
                <p className="text-xs font-bold text-white">AI Chat</p>
                <p className="text-[9px] text-zinc-500 truncate">ICDRRMO · HapIsabela</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="shrink-0 rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white touch-manipulation"
              aria-label="Close AI Chat"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div
            ref={scrollRef}
            className="flex-1 min-h-[160px] max-h-[min(62dvh,460px)] overflow-y-auto overscroll-contain px-3 py-3 space-y-3"
          >
            {messages.map((msg, i) => {
              const actions =
                msg.role === "assistant" ? resolveAiChatActions(msg.actionIds, props.portal) : [];
              return (
                <div
                  key={i}
                  className={`flex flex-col gap-2 ${msg.role === "user" ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[94%] text-sm leading-relaxed rounded-xl px-3 py-2.5 break-words whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-rose-950/55 text-rose-50 border border-rose-500/25"
                        : "bg-zinc-900/90 text-zinc-100 border border-white/[0.08]"
                    }`}
                  >
                    {msg.text}
                  </div>
                  {actions.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 max-w-[94%]">
                      {actions.map((action) => (
                        <button
                          key={action.id}
                          type="button"
                          onClick={() => onActionClick([action.id])}
                          className="rounded-full border border-orange-500/40 bg-orange-600/90 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:bg-orange-500 active:scale-[0.98] touch-manipulation transition-colors"
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
            {busy ? (
              <div className="flex items-center gap-2 text-xs text-zinc-500 pl-1">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-400" />
                Thinking…
              </div>
            ) : null}
            <div ref={endRef} className="h-px shrink-0" aria-hidden />
          </div>

          <form
            className="flex shrink-0 gap-2 border-t border-orange-500/12 p-2.5 bg-black/60"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask ICDRRMO AI…"
              className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-base sm:text-sm text-white outline-none focus:ring-2 focus:ring-orange-500/35"
              disabled={busy}
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="shrink-0 rounded-xl bg-orange-600 px-3 py-2.5 text-white disabled:opacity-40 touch-manipulation"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="pointer-events-auto flex h-10 w-10 flex-col items-center justify-center gap-0.5 rounded-full bg-gradient-to-br from-orange-600 to-rose-600 text-white shadow-md ring-1 ring-orange-400/30 hover:scale-105 active:scale-95 transition-transform touch-manipulation"
        aria-expanded={open}
        aria-label={open ? "Close AI Chat" : "Open AI Chat"}
        title="AI Chat"
      >
        {open ? (
          <X className="h-4 w-4" aria-hidden />
        ) : (
          <>
            <MessageCircle className="h-4 w-4" aria-hidden />
            <span className="text-[7px] font-bold leading-none">AI</span>
          </>
        )}
      </button>
    </div>
  );
}
