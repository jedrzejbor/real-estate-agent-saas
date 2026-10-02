import { expect, type APIRequestContext } from '@playwright/test';

const mailpitUrl = 'http://localhost:8125/api/v1';

export async function findMailLink(
  request: APIRequestContext,
  email: string,
  linkPattern: RegExp,
): Promise<string> {
  let link: string | undefined;
  await expect
    .poll(
      async () => {
        const response = await request.get(`${mailpitUrl}/messages`);
        expect(response.ok()).toBeTruthy();
        const body = (await response.json()) as {
          messages: Array<{ ID: string; To: Array<{ Address: string }> }>;
        };
        for (const message of body.messages) {
          if (
            !message.To.some(
              (recipient) => recipient.Address.toLowerCase() === email,
            )
          )
            continue;
          const detail = await request.get(
            `${mailpitUrl}/message/${message.ID}`,
          );
          if (!detail.ok()) continue;
          const content = (await detail.json()) as { Text: string };
          link = content.Text.match(linkPattern)?.[0];
          if (link) return true;
        }
        return false;
      },
      { timeout: 15_000 },
    )
    .toBe(true);
  return link!;
}
