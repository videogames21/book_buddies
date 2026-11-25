// Reads the emails the app sent, from Mailpit's HTTP API. Test-only; every address is
// invented and unique to its test, so no test reads another's mail.

const MAILPIT_URL = process.env.E2E_MAILPIT_URL ?? "http://127.0.0.1:8025";

type MessageSummary = { ID: string };

async function messagesTo(address: string): Promise<MessageSummary[]> {
  const query = encodeURIComponent(`to:"${address}"`);
  const response = await fetch(`${MAILPIT_URL}/api/v1/search?query=${query}`);
  if (!response.ok)
    throw new Error(`Mailpit search failed: ${response.status}`);
  const body = (await response.json()) as { messages?: MessageSummary[] };
  return body.messages ?? [];
}

/** Waits for the `count`-th email to an address (newest first) and returns its text. */
export async function emailText(address: string, count = 1): Promise<string> {
  const deadline = Date.now() + 15_000;
  for (;;) {
    const messages = await messagesTo(address);
    const newest = messages.length >= count ? messages[0] : undefined;
    if (newest) {
      const response = await fetch(
        `${MAILPIT_URL}/api/v1/message/${newest.ID}`,
      );
      return ((await response.json()) as { Text: string }).Text;
    }
    if (Date.now() > deadline) throw new Error("no email arrived in Mailpit");
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

/** The link in an email, with the token in its fragment. */
export function linkIn(text: string, path: string): string {
  const match = new RegExp(`https?://\\S+${path}#token=\\S+`).exec(text);
  if (!match) throw new Error(`no ${path} link in the email`);
  return match[0];
}
