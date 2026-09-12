import { z } from 'zod';
import type { Message } from './domain.js';

const timestamp = z.string().regex(/^\d{10,}\.\d{6}$/);
const newMessage = z.object({
  type: z.literal('message'),
  channel: z.string().regex(/^C[A-Z0-9]+$/),
  user: z.string().regex(/^[UW][A-Z0-9]+$/),
  ts: timestamp,
  text: z.string().min(1),
  thread_ts: timestamp.optional(),
  subtype: z.string().optional(),
  bot_id: z.string().optional(),
  app_id: z.string().optional(),
  files: z.array(z.unknown()).optional(),
});

/** Initial message only: edits/deletions never replace the original result. */
export function normalizeMessage(event: unknown, botUserId: string): Message | null {
  const parsed = newMessage.safeParse(event);
  if (!parsed.success) return null;
  const m = parsed.data;
  if (m.bot_id || m.app_id || m.user === botUserId || (m.subtype && m.subtype !== 'me_message')) return null;
  if (m.files?.length) return null;
  // Slack custom emoji names contain letters; remove these before checking for text.
  if (!/[\p{L}\p{N}]/u.test(m.text.replace(/:[a-zA-Z0-9_+-]+:/g, ''))) return null;
  return { channelId: m.channel, userId: m.user, ts: m.ts, text: m.text, threadTs: m.thread_ts ?? null };
}

export interface PublicChannel {
  id: string;
  name: string;
  is_private?: boolean;
  is_archived?: boolean;
  is_ext_shared?: boolean;
  is_pending_ext_shared?: boolean;
  is_im?: boolean;
  is_mpim?: boolean;
  is_member?: boolean;
  is_general?: boolean;
}

export function eligibleChannel(channel: PublicChannel) {
  return channel.id.startsWith('C') && !channel.is_private && !channel.is_archived
    && !channel.is_ext_shared && !channel.is_pending_ext_shared && !channel.is_im && !channel.is_mpim;
}
