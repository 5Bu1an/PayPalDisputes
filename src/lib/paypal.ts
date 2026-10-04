const API_BASE = process.env.PAYPAL_API_BASE ?? "https://api-m.sandbox.paypal.com";

let cachedToken: { value: string; expiresAt: number } | null = null;

export async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.value;

  const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET } = process.env;
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    throw new Error("PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET missing from .env.local");
  }

  const res = await fetch(`${API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`PayPal auth failed: ${res.status} ${await res.text()}`);

  const data = (await res.json()) as { access_token: string; expires_in: number };
  // Refresh a minute early so a token never expires mid-request.
  cachedToken = { value: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return cachedToken.value;
}

async function paypalGet<T>(pathAndQuery: string): Promise<T> {
  const res = await fetch(`${API_BASE}${pathAndQuery}`, {
    headers: { Authorization: `Bearer ${await getAccessToken()}` },
  });
  if (!res.ok) throw new Error(`PayPal GET ${pathAndQuery} failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

/** Lists dispute ids updated in the last `days` days, following pagination. */
export async function listDisputeIds(days = 30): Promise<string[]> {
  const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  let next: string | undefined = `/v1/customer/disputes?start_time=${encodeURIComponent(start)}&page_size=50`;
  const ids: string[] = [];

  while (next) {
    const page: { items?: { dispute_id: string }[]; links?: { rel: string; href: string }[] } =
      await paypalGet(next);
    ids.push(...(page.items ?? []).map((d) => d.dispute_id));
    const href = page.links?.find((l) => l.rel === "next")?.href;
    next = href ? href.replace(API_BASE, "") : undefined;
  }
  return ids;
}

/** Full dispute details (the list endpoint only returns a summary). */
export function getDispute<T = unknown>(disputeId: string): Promise<T> {
  return paypalGet<T>(`/v1/customer/disputes/${encodeURIComponent(disputeId)}`);
}

/**
 * Asks PayPal whether a webhook really came from them.
 * Note: events sent from the dashboard's Webhooks Simulator cannot be verified.
 */
export async function verifyWebhookSignature(headers: Headers, event: unknown): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) throw new Error("PAYPAL_WEBHOOK_ID not set");

  const res = await fetch(`${API_BASE}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${await getAccessToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      auth_algo: headers.get("paypal-auth-algo"),
      cert_url: headers.get("paypal-cert-url"),
      transmission_id: headers.get("paypal-transmission-id"),
      transmission_sig: headers.get("paypal-transmission-sig"),
      transmission_time: headers.get("paypal-transmission-time"),
      webhook_id: webhookId,
      webhook_event: event,
    }),
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { verification_status: string };
  return data.verification_status === "SUCCESS";
}
