import { WebClient } from '@slack/web-api';
import type { ChatPostMessageArguments } from '@slack/web-api';
import type { PublicChannel } from './events.js';

export interface SlackUser { id: string; teamId: string; timezone?: string; bot: boolean; deleted: boolean; stranger: boolean }
export interface SlackPort {
  listChannels(): Promise<PublicChannel[]>;
  channel(id: string): Promise<PublicChannel>;
  join(id: string): Promise<void>;
  user(id: string): Promise<SlackUser>;
  reaction(channel: string, timestamp: string, name: string): Promise<void>;
  post(payload: ChatPostMessageArguments): Promise<void>;
}
export class SlackAPI implements SlackPort {
  constructor(readonly client: WebClient) {}
  async listChannels(): Promise<PublicChannel[]> {
    const result: PublicChannel[] = [];
    let cursor: string | undefined;
    do {
      const response = await this.client.conversations.list({ types: 'public_channel', exclude_archived: true, limit: 200, cursor });
      for (const c of response.channels ?? []) if (c.id && c.name) result.push({ ...c, id: c.id, name: c.name });
      cursor = response.response_metadata?.next_cursor || undefined;
    } while (cursor);
    return result;
  }
  async channel(id: string): Promise<PublicChannel> {
    const response = await this.client.conversations.info({ channel: id });
    const c = response.channel;
    if (!c?.id || !c.name) throw new Error('Invalid Slack channel response');
    return { ...c, id: c.id, name: c.name };
  }
  async join(id: string) { await this.client.conversations.join({ channel: id }); }
  async user(id: string): Promise<SlackUser> {
    const response = await this.client.users.info({ user: id });
    const u = response.user;
    if (!u?.id) throw new Error('Invalid Slack user response');
    return { id: u.id, teamId: u.team_id ?? '', timezone: u.tz, bot: Boolean(u.is_bot), deleted: Boolean(u.deleted), stranger: Boolean(u.is_stranger) };
  }
  async reaction(channel: string, timestamp: string, name: string) {
    await this.client.reactions.add({ channel, timestamp, name });
  }
  async post(payload: ChatPostMessageArguments) { await this.client.chat.postMessage(payload); }
}

/** Log machine codes only; upstream errors may contain message text or tokens. */
export function errorCode(error: unknown): string {
  if (typeof error !== 'object' || !error) return 'unknown_error';
  const e = error as { code?: unknown; status?: unknown; data?: { error?: unknown } };
  const code = e.data?.error ?? e.code ?? e.status;
  return typeof code === 'string' && /^[a-zA-Z0-9_]+$/.test(code) ? code : typeof code === 'number' ? `http_${code}` : 'unknown_error';
}
