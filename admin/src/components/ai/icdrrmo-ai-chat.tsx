"use client";

import type { ReactElement } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, ChevronDown, Loader2, MessageCircle, Send, X } from "lucide-react";
import { sendAiChat, sendGuestAiChat, type AiChatResponse } from "@/lib/icdrrmo-ai";
import { OpsApiError, opsApiErrorUserMessage } from "@/lib/ops-api";

type ChatMessage = { role: "user" | "assistant"; text: string };

const INTRO =
  "HapIsabela! Ako ang ICDRRMO AI — opisyal na assistant ng Isabela City DRRMO. Magtanong tungkol sa SOS, panahon, evacuation, preparedness, barangay, o kung paano gamitin ang SMART app.";

export function IcdrrmoAiChat(props: {
  accessToken: string | null;
  portal: "citizen" | "chairman" | "responder" | "ops" | "home";
  /** When true, show chat without sign-in (uses /ai/guest-chat). */
  guestMode?: boolean;
}): ReactElement | null {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: "assistant", text: INTRO }]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const canChat = Boolean(props.accessToken) || props.guestMode;

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
      setMessages((m) => [...m, { role: "assistant", text: res.reply }]);
    } catch (e: unknown) {
      const err =
        e instanceof OpsApiError
          ? opsApiErrorUserMessage(e)
          : e instanceof Error
            ? e.message
            : "AI is temporarily unavailable. Check API connection.";
      setMessages((m) => [...m, { role: "assistant", text: err }]);
    } finally {
      setBusy(false);
    }
  }, [input, props.accessToken, canChat, busy, conversationId]);

  if (!canChat) return null;

  return (
    <div
      className="fixed z-[180] flex flex-col items-stretch gap-2 pointer-events-none
        bottom-[max(0.75rem,env(safe-area-inset-bottom))]
        right-[max(0.75rem,env(safe-area-inset-right))]
        left-[max(0.75rem,env(safe-area-inset-left))]
        sm:left-auto sm:max-w-[min(100vw-1.5rem,400px)] sm:items-end"
      data-portal={props.portal}
    >
      {open ? (
        <div
          className="pointer-events-auto flex w-full sm:w-[min(100vw-1.5rem,400px)] max-h-[min(85dvh,560px)] flex-col overflow-hidden rounded-2xl border border-orange-500/25 bg-[#0a0a0a]/98 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.85)] backdrop-blur-md"
          role="dialog"
          aria-label="ICDRRMO AI chat"
        >
          <header className="flex items-center justify-between gap-2 border-b border-orange-500/15 bg-gradient-to-r from-orange-950/60 to-rose-950/40 px-3 py-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <Bot className="h-5 w-5 shrink-0 text-orange-400" aria-hidden />
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-orange-200">
                  ICDRRMO AI
                </p>
                <p className="text-[10px] text-zinc-500 truncate">HapIsabela · live ICDRRMO data</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white"
              aria-label="Close chat"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div
            ref={scrollRef}
            className="flex-1 min-h-[140px] overflow-y-auto overscroll-contain px-3 py-3 space-y-3"
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`text-xs leading-relaxed rounded-xl px-3 py-2 ${
                  msg.role === "user"
                    ? "ml-6 bg-rose-950/50 text-rose-50 border border-rose-500/20"
                    : "mr-4 bg-zinc-900/80 text-zinc-200 border border-white/[0.06]"
                }`}
              >
                {msg.text}
              </div>
            ))}
            {busy ? (
              <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Thinking…
              </div>
            ) : null}
          </div>

          <form
            className="flex gap-2 border-t border-orange-500/12 p-2 bg-black/50"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Magtanong ng kahit ano tungkol sa ICDRRMO…"
              className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-base sm:text-xs text-white outline-none focus:ring-1 focus:ring-orange-500/40"
              disabled={busy}
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="rounded-xl bg-orange-600 px-3 py-2 text-white disabled:opacity-40"
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
        className="pointer-events-auto flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-gradient-to-r from-orange-600 to-rose-600 px-4 py-3.5 sm:py-3 text-sm font-bold text-white shadow-lg ring-2 ring-orange-400/30 hover:scale-[1.02] active:scale-[0.98] transition-transform touch-manipulation"
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown className="h-5 w-5" aria-hidden />
        ) : (
          <MessageCircle className="h-5 w-5" aria-hidden />
        )}
        ICDRRMO AI
      </button>
    </div>
  );
}
