export const negativeCategories = [
  'aggression', 'intimidation', 'harassment', 'discrimination',
  'sexualized_comment', 'condescension', 'targeted_sarcasm', 'passive_aggression',
] as const;
export const positiveCategories = [
  'thanks', 'encouragement', 'recognition', 'helpfulness',
  'constructive_feedback', 'repair', 'inclusion',
] as const;
export type NegativeCategory = typeof negativeCategories[number];
export type PositiveCategory = typeof positiveCategories[number];
export type Category = NegativeCategory | PositiveCategory;
export type Verdict = 'positive' | 'negative' | 'neutral' | 'indeterminate';
export type Language = 'fr' | 'en';

export interface Classification {
  verdict: Verdict;
  language: Language;
  categories: Category[];
  explanation: string;
  suggestion: string;
}

export interface Message {
  channelId: string;
  ts: string;
  userId: string;
  threadTs: string | null;
  text: string;
}

/** STAT-02/03: neutral messages remain in the denominator. No score for N=0. */
export function scoreCounts(positive: number, negative: number, neutral: number) {
  for (const count of [positive, negative, neutral]) {
    if (!Number.isSafeInteger(count) || count < 0) throw new Error('Invalid message count');
  }
  const total = positive + negative + neutral;
  return {
    total,
    positivePercent: total ? 100 * positive / total : null,
    negativePercent: total ? 100 * negative / total : null,
    score: total ? 100 * (positive - negative) / total : null,
  };
}
