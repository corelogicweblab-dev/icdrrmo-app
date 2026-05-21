/**
 * Outbound SMS: Infobip (when INFOBIP_API_KEY is set) or generic SMS_GATEWAY_URL fallback.
 * Used by Bull workers and can be called from Nest services.
 */
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('63')) return digits;
  if (digits.startsWith('0')) return `63${digits.slice(1)}`;
  if (digits.length === 10) return `63${digits}`;
  return digits;
}

async function sendViaInfobip(
  toPhone: string,
  message: string,
): Promise<{ ok: boolean; response: string }> {
  const apiKey = process.env.INFOBIP_API_KEY?.trim();
  const base = (process.env.INFOBIP_BASE_URL?.trim() || 'https://api.infobip.com').replace(/\/$/, '');
  if (!apiKey) {
    return { ok: false, response: 'INFOBIP_API_KEY not configured' };
  }
  const from = process.env.INFOBIP_SENDER?.trim() || 'ICDRRMO';
  const to = normalizePhone(toPhone);
  const res = await fetch(`${base}/sms/2/text/advanced`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `App ${apiKey}`,
    },
    body: JSON.stringify({
      messages: [
        {
          from,
          destinations: [{ to }],
          text: message,
        },
      ],
    }),
    signal: AbortSignal.timeout(20_000),
  });
  const text = await res.text();
  return { ok: res.ok, response: text.slice(0, 2000) };
}

async function sendViaGenericGateway(
  toPhone: string,
  message: string,
): Promise<{ ok: boolean; response: string }> {
  const url = process.env.SMS_GATEWAY_URL?.trim();
  const secret = process.env.SMS_GATEWAY_API_KEY?.trim();
  if (!url) {
    return { ok: false, response: 'SMS_GATEWAY_URL not configured' };
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
    },
    body: JSON.stringify({ to: toPhone, message }),
    signal: AbortSignal.timeout(15_000),
  });
  const text = await res.text();
  return { ok: res.ok, response: text.slice(0, 2000) };
}

export async function sendOutboundSms(
  toPhone: string,
  message: string,
): Promise<{ ok: boolean; response: string; provider: 'infobip' | 'gateway' | 'none' }> {
  if (process.env.INFOBIP_API_KEY?.trim()) {
    const r = await sendViaInfobip(toPhone, message);
    return { ...r, provider: 'infobip' };
  }
  const g = await sendViaGenericGateway(toPhone, message);
  return { ...g, provider: g.ok ? 'gateway' : 'none' };
}
