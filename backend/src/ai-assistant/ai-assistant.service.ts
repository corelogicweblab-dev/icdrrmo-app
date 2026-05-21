import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import { randomUUID } from 'crypto';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { AiContextService } from './ai-context.service';
import { WeatherService } from '../weather/weather.service';
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
    private readonly weatherService: WeatherService,
  ) {}

  detectLanguage(_message: string, preferred?: AiLanguage): AiLanguage {
    return preferred ?? 'en';
  }

  /** Public portal assistant (no JWT) — uses Gemini when configured. */
  async guestChat(dto: AiChatDto): Promise<AiChatResponse> {
    const lang = this.detectLanguage(dto.message, dto.language);
    const conversationId = dto.conversationId?.trim() || randomUUID();
    const ctx: AiRoleContext = {
      role: 'CITIZEN',
      generatedAt: new Date().toISOString(),
      summary:
        'Visitor on ICDRRMO SMART portal (HapIsabela). Sign in as Citizen for SOS, or use the Prepare tab for emergency kit guides.',
      metrics: { label: 'ICDRRMO Portal', status: 'online' },
      weather: await this.weatherService.getSituationSnapshot().catch(() => null),
    };
    const guestActor: JwtPayload = {
      sub: 'guest',
      role: UserRole.CITIZEN,
      email: 'guest@portal',
    };

    const key =
      this.config.get<string>('GEMINI_API_KEY')?.trim() ||
      this.config.get<string>('GOOGLE_AI_API_KEY')?.trim();

    if (key) {
      try {
        const reply = await this.geminiReply(key, lang, guestActor, dto.message, ctx);
        return {
          reply,
          language: lang,
          engine: 'gemini',
          conversationId,
          suggestedActions: ['Open Citizen portal', 'Sign in', 'Open Map tab'],
        };
      } catch (e) {
        this.logger.warn(`Guest Gemini fallback: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    const reply = this.contextRagReply(dto.message, ctx, lang);
    return {
      reply,
      language: lang,
      engine: 'context-rag',
      conversationId,
      suggestedActions: ['Open Citizen portal', 'Sign in', 'Emergency SOS'],
    };
  }

  async chat(actor: JwtPayload, dto: AiChatDto): Promise<AiChatResponse> {
    const lang = this.detectLanguage(dto.message, dto.language);
    let ctx: Awaited<ReturnType<AiContextService['build']>>;
    try {
      ctx = await this.context.build(actor);
    } catch (e) {
      this.logger.warn(
        `AI context build failed: ${e instanceof Error ? e.message : String(e)}`,
      );
      ctx = {
        role: actor.role,
        generatedAt: new Date().toISOString(),
        summary: `${actor.role} session — live dashboard context is still loading.`,
        metrics: { status: 'online', label: 'Live' },
      };
    }
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
      'You are ICDRRMO AI for Isabela City, Basilan — greet with spirit of "HapIsabela!" (happy, prepared Isabela).',
      'Answer ANY reasonable question about: disasters, typhoon/flood/fire, this SMART app, SOS, evacuation, barangay DRRM, responders, weather, preparedness, profiles, and government coordination.',
      'Use CONTEXT when available; otherwise give accurate general DRRM guidance for the Philippines / BARMM context.',
      'Reply in English only — clear, concise, professional emergency language.',
      `User role: ${actor.role}.`,
      'Never refuse ICDRRMO-related questions. If unsure, suggest: Map tab, Prepare tab, Profile, SOS button, or contact barangay/ICDRRMO.',
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
    _lang: AiLanguage,
  ): string {
    const q = message.toLowerCase().trim();
    const greet =
      /hap\s*isabela|hello|hi\b|good (morning|afternoon|evening)/.test(q);
    const prefix = greet ? 'HapIsabela! ' : '';

    const w = ctx.weather as {
      rainOutlook6h?: { willRainLikely?: boolean; maxPrecipProbPct?: number; headline?: string };
      current?: { weatherLabel?: string; temperatureC?: number | null };
    } | null;
    const evac = (ctx.evacuation as unknown[]) ?? [];
    const inc = (ctx.incidents as unknown[]) ?? [];
    const advisories = (ctx.advisories as unknown[]) ?? [];

    if (/sos|emergency|tulong|responde|help me|danger/.test(q)) {
      return (
        prefix +
        (inc.length
          ? `You have ${inc.length} incident(s) on record. For a new emergency: open Home → choose type (flood, fire, medical, typhoon) → tap Send SOS with GPS enabled. Responders receive your location and medical profile automatically.`
          : 'For an emergency: Home tab → select SOS type → tap Send SOS. Turn on GPS so ICDRRMO gets your exact location. Stay on the line if safe; follow barangay or EOC instructions.')
      );
    }

    if (/weather|rain|bagyo|typhoon|pagasa|gdacs|wind|flood/.test(q)) {
      const rain = w?.rainOutlook6h;
      const temp = w?.current?.temperatureC;
      const label = w?.current?.weatherLabel;
      let body = 'Open the Map tab for live rain, wind, and temperature layers plus PAGASA/GDACS markers.';
      if (rain) {
        body = `${rain.headline ?? '6-hour outlook'} — ${rain.willRainLikely ? 'rain is likely' : 'lower rain chance'} (up to ${rain.maxPrecipProbPct ?? 0}% precip probability). ${body}`;
      }
      if (label || temp != null) {
        body = `Now: ${label ?? 'conditions available'}${temp != null ? `, ${temp}°C` : ''}. ${body}`;
      }
      return prefix + body;
    }

    if (/evac|evacuation|shelter|lumikas|center/.test(q)) {
      return (
        prefix +
        (evac.length
          ? `${evac.length} evacuation center(s) are in your feed. Map tab → enable GPS → pick a site with available slots → use Directions on the card. Bring go-bag, IDs, and meds.`
          : 'Enable GPS on the Map tab to see nearest evacuation centers. Prepare tab lists go-bag and family plan steps before you leave.')
      );
    }

    if (/prepare|go bag|go-bag|kit|checklist|ready/.test(q)) {
      return (
        prefix +
        'Preparedness tab: tap each card (go bag, family plan, evacuation route, water, meds) for step-by-step guides. Check off items when done — progress saves to your account.'
      );
    }

    if (/map|layer|radar/.test(q)) {
      return (
        prefix +
        'Map tab shows ICDRRMO live weather layers (no third-party logo), hazard markers, and shelters. Turn on GPS for distance to the nearest evacuation center.'
      );
    }

    if (/medical|blood|allergy|profile|contact/.test(q)) {
      return (
        prefix +
        'Profile stores blood type, allergies, conditions, and emergency contacts. This data is sent to responders when you trigger SOS — keep it updated.'
      );
    }

    if (/community|volunteer|donation|advisory|alert/.test(q)) {
      return (
        prefix +
        `Community tab has barangay posts and volunteer calls. Alerts tab shows your notifications${advisories.length ? `; ${advisories.length} hazard advisory point(s) are active in the region` : ''}.`
      );
    }

    if (/login|sign in|register|account|password/.test(q)) {
      return (
        prefix +
        'Sign in at the home page with your email and password. New residents: Citizen registration — barangay, medical info, and photo are required.'
      );
    }

    if (/what is icdrrmo|who are you|icdrrmo|isabela|drrmo/.test(q)) {
      return (
        prefix +
        'ICDRRMO is Isabela City Disaster Risk Reduction and Management Office (Basilan). This SMART app handles SOS, live weather map, evacuation info, preparedness guides, and barangay coordination.'
      );
    }

    if (/help|how to|guide|what can/.test(q)) {
      return (
        prefix +
        `I can help with: SOS (GPS emergency), Map & weather, Alerts, Community feed, Prepare guides, and Profile. ${ctx.summary} What would you like step-by-step?`
      );
    }

    const topic = message.trim().slice(0, 80);
    return (
      prefix +
      `About "${topic}": ${ctx.summary} ` +
      'Try: SOS (emergency), Map (weather & shelters), Prepare (kits), or Profile (medical). Ask a specific question and I will walk you through it.'
    );
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
