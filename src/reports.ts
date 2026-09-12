import { DateTime } from 'luxon';
import { scoreCounts } from './domain.js';

export const DEFAULT_ZONE = 'America/Toronto';
export function validZone(zone: string | undefined): string {
  return zone && DateTime.now().setZone(zone).isValid ? zone : DEFAULT_ZONE;
}
export interface Period { key: string; from: number; to: number; zone: string }
export function monthPeriod(key: string | undefined, zone: string, now = Date.now()): Period {
  zone = validZone(zone);
  const date = key ? (/^20\d{2}-(0[1-9]|1[0-2])$/.test(key) ? DateTime.fromISO(`${key}-01`, { zone }) : null)
    : DateTime.fromMillis(now, { zone });
  if (!date?.isValid) throw new Error('Mois invalide : utiliser AAAA-MM.');
  const start = date.startOf('month');
  return { key: start.toFormat('yyyy-MM'), from: start.toMillis() / 1000,
    to: start.plus({ months: 1 }).toMillis() / 1000, zone };
}
/** REPORT-01: one previous-month job, eligible from the first at 09:00 local time. */
export function dueMonthlyPeriod(zone: string, now = Date.now()): Period | null {
  const date = DateTime.fromMillis(now, { zone: validZone(zone) });
  if (date < date.startOf('month').set({ hour: 9 })) return null;
  return monthPeriod(date.minus({ months: 1 }).toFormat('yyyy-MM'), zone, now);
}

export type ReportScope = { kind: 'channels' | 'users' } | { kind: 'channel' | 'user'; id: string };
export const commandHelp = 'Usage : /modulo canaux [AAAA-MM] · /modulo canal #canal [AAAA-MM] · /modulo utilisateurs [AAAA-MM] · /modulo utilisateur @personne [AAAA-MM]';
export function parseReportCommand(text: string): { scope: ReportScope; month?: string } {
  const args = text.trim().split(/\s+/).filter(Boolean);
  if (args.length === 0) return { scope: { kind: 'channels' } };
  const aliases: Record<string, ReportScope['kind']> = { canaux: 'channels', channels: 'channels', utilisateurs: 'users', users: 'users', canal: 'channel', channel: 'channel', utilisateur: 'user', user: 'user' };
  const kind = aliases[args[0]!];
  if (!kind) throw new Error(commandHelp);
  const single = kind === 'channel' || kind === 'user';
  let scope: ReportScope;
  if (single) {
    const raw = args[1] ?? '';
    const match = kind === 'channel' ? /^(?:<#)?(C[A-Z0-9]+)(?:\|[^>]+)?[>]?$/ : /^(?:<@)?([UW][A-Z0-9]+)(?:\|[^>]+)?[>]?$/;
    const id = match.exec(raw)?.[1];
    if (!id) throw new Error('Sélectionner une mention Slack de canal ou de personne. ' + commandHelp);
    scope = { kind, id };
  } else scope = { kind };
  const monthIndex = single ? 2 : 1;
  const month = args[monthIndex];
  if (args.length > monthIndex + 1 || (month && !/^20\d{2}-(0[1-9]|1[0-2])$/.test(month))) throw new Error(commandHelp);
  return { scope, month };
}

export interface Statistic {
  id: string;
  positive: number;
  negative: number;
  neutral: number;
  indeterminate: number;
  pending: number;
  failed: number;
}
export function rankStatistics(rows: Statistic[]) {
  return rows.map(row => ({ ...row, ...scoreCounts(row.positive, row.negative, row.neutral) }))
    .sort((a, b) => (b.score ?? -Infinity) - (a.score ?? -Infinity) || b.total - a.total || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** Each page fits comfortably in Slack; every row is retained, not only medalists. */
export function reportPages(rows: Statistic[], scope: ReportScope, period: Period, coverage: string): string[] {
  const user = scope.kind === 'user' || scope.kind === 'users';
  const ranked = rankStatistics(rows);
  const medalIds = ranked.filter(row => row.total >= 20).slice(0, 3).map(row => row.id);
  const lines = ranked.map(row => {
    const index = medalIds.indexOf(row.id);
    const medal = scope.kind === 'user' || scope.kind === 'channel' ? '' : (['🥇 ', '🥈 ', '🥉 '][index] ?? '');
    const target = user ? `<@${row.id}>` : `<#${row.id}>`;
    const score = row.score === null ? '—' : row.score.toFixed(1);
    return `${medal}${target} · ${row.total} analysés · +${row.positivePercent?.toFixed(1) ?? '—'} % / −${row.negativePercent?.toFixed(1) ?? '—'} % · ${row.neutral} neutres · *${score} pts* · ${row.indeterminate} indéterminés / ${row.pending} en attente / ${row.failed} échecs`;
  });
  if (!lines.length) lines.push('Aucun message observé pour ce périmètre.');
  const pages: string[] = [];
  let page = '';
  for (const line of lines) {
    if (page.length + line.length > 2400) { pages.push(page); page = ''; }
    page += line + '\n';
  }
  if (page) pages.push(page);
  return pages.map((body, index) => `*Modulo · ${user ? 'Utilisateurs' : 'Canaux'} · ${period.key}* (${index + 1}/${pages.length})\n${coverage}\n${body}\nScore = % positifs − % négatifs, neutres inclus. Indéterminés et échecs exclus. Médailles : au moins 20 messages analysés. Ces résultats concernent les messages observés.`);
}
