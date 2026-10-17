// End-of-session survey (GDD, "Ukuran keberhasilan": keseruan rata-rata ≥ 4 dari 5, survei peserta
// 3 pertanyaan). Anonymous: answers are stored without nickname or player id in every report.

export type SurveyQuestionId = 'seru' | 'jelas' | 'belajar';

export interface SurveyQuestion {
  id: SurveyQuestionId;
  text: string;
  /** Labels for 1 and 5. */
  low: string;
  high: string;
}

export const SURVEY: SurveyQuestion[] = [
  { id: 'seru', text: 'Seberapa seru permainan tadi?', low: 'Membosankan', high: 'Seru sekali' },
  { id: 'jelas', text: 'Seberapa jelas aturan dan tujuan permainannya?', low: 'Bingung', high: 'Sangat jelas' },
  { id: 'belajar', text: 'Seberapa membantu permainan ini untuk memahami dampak kebijakan ekonomi?', low: 'Tidak membantu', high: 'Sangat membantu' },
];

export const SURVEY_COMMENT_MAX = 200;

export type SurveyAnswers = Record<SurveyQuestionId, number>;

export function validSurveyAnswers(v: unknown): v is SurveyAnswers {
  if (!v || typeof v !== 'object') return false;
  const a = v as Record<string, unknown>;
  return Object.keys(a).length === SURVEY.length && SURVEY.every(q => Number.isInteger(a[q.id]) && (a[q.id] as number) >= 1 && (a[q.id] as number) <= 5);
}

/** Trims and strips control characters; an empty comment is no comment. */
export function cleanComment(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[\p{C}]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, SURVEY_COMMENT_MAX).trim();
  return cleaned || null;
}
