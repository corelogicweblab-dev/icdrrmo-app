import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { AiContextService } from './ai-context.service';
import { AiChatDto } from './dto/ai-chat.dto';
import type { AiChatResponse, AiLanguage, AiRoleContext } from './ai-assistant.types';

const LANG_NAMES: Record<AiLanguage, string> = {
  en: 'English',
  fil: 'Filipino (Tagalog)',
  ceb: 'Cebuano',
  cbk: 'Chavacano',
};

@Injectable()
export class AiAssistantService {
  private readonly logger = new Logger(AiAssistantService.name);

  constructor(
    private readonly context: AiContextService,
    private readonly config: ConfigService,
  ) {}

  detectLanguage(message: string, preferred?: AiLanguage): AiLanguage {
    if (preferred) return preferred;
    const m = message.toLowerCase();
    if (/\b(unsa|kaayo|lugar|bagyo)\b/.test(m)) return 'ceb';
    if (/\b(cosa|con|el|ta|mira|peligro)\b/.test(m)) return 'cbk';
    if (/\b(ano|mga|barangay|lumikas|bagyo|ulan|sakuna|po\b|ho\b)\b/.test(m)) return 'fil';
    return 'en';
  }

  /** Public portal assistant (no JWT) — context-RAG only, rate-limited at controller. */
  async guestChat(dto: AiChatDto): Promise<AiChatResponse> {
    const lang = this.detectLanguage(dto.message, dto.language);
    const conversationId = dto.conversationId?.trim() || randomUUID();
    const ctx: AiRoleContext = {
      role: 'CITIZEN',
      generatedAt: new Date().toISOString(),
      summary:
        'Visitor on ICDRRMO SMART portal (not signed in). Direct them to Citizen portal for SOS, or sign-in for responders/operators.',
      metrics: { label: 'ICDRRMO Portal', status: 'online' },
    };
    const reply = this.contextRagReply(dto.message, ctx, lang);
    return {
      reply,
      language: lang,
      engine: 'context-rag',
      conversationId,
      suggestedActions: [
        lang === 'fil' ? 'Buksan ang Citizen portal' : 'Open Citizen portal',
        lang === 'fil' ? 'Mag-sign in' : 'Sign in',
        lang === 'fil' ? 'Tawag sa hotline' : 'Call emergency hotline',
      ],
    };
  }

  async chat(actor: JwtPayload, dto: AiChatDto): Promise<AiChatResponse> {
    const lang = this.detectLanguage(dto.message, dto.language);
    const ctx = await this.context.build(actor);
    const conversationId = dto.conversationId?.trim() || randomUUID();

    const key =
      this.config.get<string>('GEMINI_API_KEY')?.trim() ||
      this.config.get<string>('GOOGLE_AI_API_KEY')?.trim();

    if (key) {
      try {
        const reply = await this.geminiReply(key, lang, actor, dto.message, ctx);
        return {
          reply,
          language: lang,
          engine: 'gemini',
          conversationId,
          suggestedActions: this.suggestedActions(ctx, lang),
        };
      } catch (e) {
        this.logger.warn(`Gemini fallback: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    const reply = this.contextRagReply(dto.message, ctx, lang);
    return {
      reply,
      language: lang,
      engine: 'context-rag',
      conversationId,
      suggestedActions: this.suggestedActions(ctx, lang),
    };
  }

  private systemPrompt(lang: AiLanguage, actor: JwtPayload): string {
    return [
      'You are ICDRRMO AI — the official emergency operations assistant for Isabela City DRRMO.',
      'Answer using ONLY the provided CONTEXT about incidents, weather, evacuation, governance, and resources.',
      'Be concise, actionable, and calm. If data is missing, say what the user should do (call hotline, check map, re-login).',
      `Respond in ${LANG_NAMES[lang]}.`,
      `User role: ${actor.role}.`,
      'Topics: SOS lifecycle, Windy/GDACS/PAGASA hazards, evacuation capacity, barangay advisories, responder assignments, EOC KPIs, citizen preparedness.',
    ].join('\n');
  }

  private async geminiReply(
    apiKey: string,
    lang: AiLanguage,
    actor: JwtPayload,
    message: string,
    ctx: Awaited<ReturnType<AiContextService['build']>>,
  ): Promise<string> {
    const model = this.config.get<string>('GEMINI_MODEL')?.trim() || 'gemini-2.0-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const contextJson = JSON.stringify(ctx).slice(0, 14_000);
    const body = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `${this.systemPrompt(lang, actor)}\n\nCONTEXT:\n${contextJson}\n\nUSER:\n${message}`,
            },
          ],
        },
      ],
      generationConfig: { temperature: 0.35, maxOutputTokens: 1024 },
    };
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Gemini HTTP ${res.status}: ${errText.slice(0, 200)}`);
    }
    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) throw new Error('Empty Gemini response');
    return text;
  }

  private contextRagReply(
    message: string,
    ctx: Awaited<ReturnType<AiContextService['build']>>,
    lang: AiLanguage,
  ): string {
    const q = message.toLowerCase();
    const lines: string[] = [];

    const t = (en: string, fil: string, ceb: string, cbk: string) => {
      if (lang === 'fil') return fil;
      if (lang === 'ceb') return ceb;
      if (lang === 'cbk') return cbk;
      return en;
    };

    lines.push(t(
      `ICDRRMO AI (${ctx.role} view): ${ctx.summary}`,
      `ICDRRMO AI (${ctx.role}): ${ctx.summary}`,
      `ICDRRMO AI (${ctx.role}): ${ctx.summary}`,
      `ICDRRMO AI (${ctx.role}): ${ctx.summary}`,
    ));

    if (/weather|ulan|bagyo|pagasa|gdacs|windy|panahon/.test(q)) {
      const w = ctx.weather as { rainOutlook6h?: { willRainLikely?: boolean; maxPrecipProbPct?: number } } | null;
      if (w?.rainOutlook6h) {
        lines.push(t(
          `Rain outlook (6h): ${w.rainOutlook6h.willRainLikely ? 'rain likely' : 'lower rain chance'}, max precip probability ${w.rainOutlook6h.maxPrecipProbPct ?? 0}%. Check the Map tab for Windy layers and PAGASA/GDACS markers.`,
          `Panahon (6 oras): ${w.rainOutlook6h.willRainLikely ? 'may ulan' : 'mas mababa ang tsansa ng ulan'}, max ${w.rainOutlook6h.maxPrecipProbPct ?? 0}%. Buksan ang Map para sa Windy at PAGASA/GDACS.`,
          `Panahon (6 oras): ${w.rainOutlook6h.willRainLikely ? 'muulan' : 'ubos ang tsansa'}, max ${w.rainOutlook6h.maxPrecipProbPct ?? 0}%. Tan-awa ang Map.`,
          `Tiempo (6 horas): ${w.rainOutlook6h.willRainLikely ? 'puede llueve' : 'menos lluvia'}, max ${w.rainOutlook6h.maxPrecipProbPct ?? 0}%. Mira el Mapa.`,
        ));
      } else {
        lines.push(t(
          'Weather data is loading from Open-Meteo, PAGASA, and GDACS. Open the weather map layer for live tiles.',
          'Kinukuha ang datos ng panahon. Buksan ang mapa para sa live na layers.',
          'Ga-load ang datos sa panahon. Abli ang mapa.',
          'Ta carga el tiempo. Mira el mapa.',
        ));
      }
    }

    if (/evac|evacuation|shelter|lumikas|center/.test(q)) {
      const evac = (ctx.evacuation as unknown[]) ?? [];
      if (evac.length) {
        lines.push(t(
          `${evac.length} evacuation site(s) in context. Prefer sites with available slots; use directions link on each center card.`,
          `${evac.length} evacuation center sa data. Pumili ng may bakanteng slot; gamitin ang directions.`,
          `${evac.length} evacuation center. Pilia ang naay slot; directions sa card.`,
          `${evac.length} centro de evacuación. Usa el enlace de direcciones.`,
        ));
      }
    }

    if (/sos|incident|emergency|tulong|responde/.test(q)) {
      const inc = (ctx.incidents as unknown[]) ?? [];
      lines.push(
        t(
          inc.length
            ? `${inc.length} incident(s) in your current feed. SOS lifecycle: reported → verified → responded → resolved.`
            : 'No active incidents in your scoped feed. For new emergencies use the SOS button with GPS enabled.',
          inc.length
            ? `${inc.length} insidente sa feed. SOS: reported → verified → responded → resolved.`
            : 'Walang aktibong insidente. Para sa emergency pindutin ang SOS at i-on ang GPS.',
          inc.length
            ? `${inc.length} insidente. SOS lifecycle: reported → verified → responded → resolved.`
            : 'Walay aktibong insidente. Pinduta SOS kung emergency.',
          inc.length
            ? `${inc.length} incidente. SOS: reported → verified → responded → resolved.`
            : 'No hay incidentes activos. Usa SOS con GPS.',
        ),
      );
    }

    if (/governance|kpi|analytics|response time|utilization/.test(q)) {
      const g = ctx.governance as Record<string, unknown> | undefined;
      if (g) {
        lines.push(t(
          `Governance snapshot: ${JSON.stringify(g).slice(0, 400)}`,
          `KPI: ${JSON.stringify(g).slice(0, 400)}`,
          `KPI: ${JSON.stringify(g).slice(0, 400)}`,
          `KPI: ${JSON.stringify(g).slice(0, 400)}`,
        ));
      }
    }

    if (/medical|blood|allergy|contact/.test(q)) {
      lines.push(t(
        'Medical profile (blood type, allergies, emergency contacts) is sent to responders when you trigger SOS. Update it under Profile.',
        'Ang medical profile ay ipinapadala sa responders kapag SOS. I-update sa Profile.',
        'Ang medical profile ipadala sa responders inig SOS. Update sa Profile.',
        'El perfil médico se envía con SOS. Actualiza en Profile.',
      ));
    }

    if (/community|volunteer|donation|prepared|gamif|kit/.test(q)) {
      lines.push(t(
        'Community feed shows barangay posts, volunteer calls, and donations. Preparedness checklist earns badges when completed.',
        'Ang community feed ay may posts, volunteers, at donations. Tapusin ang preparedness checklist para sa badges.',
        'Community feed — posts ug preparedness checklist.',
        'Feed de comunidad y checklist de preparación.',
      ));
    }

    if (/system|online|health|status/.test(q)) {
      const m = ctx.metrics as { label?: string; status?: string } | undefined;
      lines.push(
        m?.label
          ? t(
              `System: ${m.label} (${m.status}).`,
              `System: ${m.label}.`,
              `System: ${m.label}.`,
              `Sistema: ${m.label}.`,
            )
          : t(
              'System health is monitored on the dashboard header.',
              'Naka-monitor ang system health sa dashboard.',
              'Gi-monitor ang system.',
              'Se monitorea el sistema.',
            ),
      );
    }

    if (lines.length <= 1) {
      lines.push(t(
        'Ask about incidents, weather, evacuation, SOS lifecycle, governance KPIs, resources, or citizen engagement. I use live ICDRRMO feed data.',
        'Magtanong tungkol sa insidente, panahon, evacuation, SOS, KPI, o resources. Gamit ko ang live na data.',
        'Pangutana bahin sa insidente, panahon, evacuation, o SOS.',
        'Pregunta sobre incidentes, tiempo, evacuación, o SOS.',
      ));
    }

    return lines.join('\n\n');
  }

  private suggestedActions(
    ctx: Awaited<ReturnType<AiContextService['build']>>,
    lang: AiLanguage,
  ): string[] {
    const en =
      ctx.role === 'CITIZEN'
        ? ['Open Map', 'Check evacuation', 'Review preparedness']
        : ctx.role === 'BARANGAY_CHAIRMAN'
          ? ['Review open incidents', 'Check shelter capacity', 'View risk forecast']
          : ctx.role === 'RESPONDER'
            ? ['Open field map', 'View assignments', 'Update profile']
            : ['Open command center', 'Dispatch resources', 'Weather desk'];
    if (lang === 'fil') {
      return en.map((s) =>
        s === 'Open Map'
          ? 'Buksan ang Mapa'
          : s === 'Check evacuation'
            ? 'Tingnan evacuation'
            : s,
      );
    }
    return en;
  }
}
