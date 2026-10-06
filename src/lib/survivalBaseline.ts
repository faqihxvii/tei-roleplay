import { Metrics } from '../types';

export interface SurvivalStatus {
  status: 'STABIL' | 'WASPADA' | 'KRITIS' | 'KOLAPS';
  healthPercentage: number;
  label: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  bgLight: string;
  description: string;
}

export const BASELINE_THRESHOLDS = {
  kasMin: 3,
  moodMin: 4,
  chaosMax: 6,
};

export function getNationSurvivalStatus(metrics: Metrics): SurvivalStatus {
  if (metrics.mood <= 0 || metrics.kas <= 0 || metrics.chaos >= 10) {
    return {
      status: 'KOLAPS',
      healthPercentage: 0,
      label: 'NEGARA AMBRUK (KOLAPS)',
      badgeBg: 'bg-rose-600',
      badgeText: 'text-white',
      borderColor: 'border-rose-300',
      bgLight: 'bg-rose-50',
      description: 'Sistem pemerintahan runtuh. Salah satu indikator utama telah menyentuh batas fatal.',
    };
  }

  // Calculate composite survival index (0 - 100%)
  const moodFactor = (metrics.mood / 10) * 35;
  const kasFactor = (metrics.kas / 10) * 35;
  const peaceFactor = ((10 - metrics.chaos) / 10) * 30;
  const healthPercentage = Math.round(moodFactor + kasFactor + peaceFactor);

  const isCritical = metrics.mood <= 2 || metrics.kas <= 2 || metrics.chaos >= 8;
  const isWaspada = metrics.mood < BASELINE_THRESHOLDS.moodMin || metrics.kas < BASELINE_THRESHOLDS.kasMin || metrics.chaos > BASELINE_THRESHOLDS.chaosMax;

  if (isCritical) {
    return {
      status: 'KRITIS',
      healthPercentage,
      label: 'KRITIS: DI AMBANG KOLAPS',
      badgeBg: 'bg-rose-500',
      badgeText: 'text-white',
      borderColor: 'border-rose-200',
      bgLight: 'bg-rose-50/80',
      description: 'Negara dalam bahaya besar! Indikator utama mendekati titik fatal.',
    };
  }

  if (isWaspada) {
    return {
      status: 'WASPADA',
      healthPercentage,
      label: 'WASPADA: RISIKO AMBRUK',
      badgeBg: 'bg-amber-500',
      badgeText: 'text-white',
      borderColor: 'border-amber-200',
      bgLight: 'bg-amber-50/80',
      description: 'Stabilitas negara goyah. Perlu tindakan korektif sebelum krisis meluas.',
    };
  }

  return {
    status: 'STABIL',
    healthPercentage,
    label: 'ON-TRACK: STABIL & AMAN',
    badgeBg: 'bg-emerald-600',
    badgeText: 'text-white',
    borderColor: 'border-emerald-200',
    bgLight: 'bg-emerald-50/80',
    description: 'Semua indikator utama berada di atas batas aman minimal ketahanan nasional.',
  };
}
