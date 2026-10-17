import type { Role } from '../types';

export const ROLE_LABEL: Record<Role, string> = {
  pemerintah: 'Pemerintah',
  bankSentral: 'Bank Sentral',
  pengusaha: 'Pengusaha',
  buruh: 'Serikat Buruh',
  masyarakat: 'Masyarakat',
};

/** Card code prefix, also printed as a letter mark so roles never depend on colour alone. */
export const ROLE_CODE: Record<Role, string> = {
  pemerintah: 'PEM',
  bankSentral: 'BS',
  pengusaha: 'USH',
  buruh: 'BRH',
  masyarakat: 'MSY',
};

/**
 * Riso-style role inks, separated by lightness as well as hue so they stay apart under protan,
 * deutan and tritan vision (minimum simulated ΔE ≈ 26). Two are light, so text on them uses ROLE_INK.
 */
export const ROLE_COLOR: Record<Role, string> = {
  pemerintah: '#1b2a41',
  bankSentral: '#0067a5',
  pengusaha: '#e0a100',
  buruh: '#c30700',
  masyarakat: '#5fb49c',
};

/** Text colour on a ROLE_COLOR fill, each pair at least 4.5:1. */
export const ROLE_INK: Record<Role, string> = {
  pemerintah: '#ffffff',
  bankSentral: '#ffffff',
  pengusaha: '#1a1a1a',
  buruh: '#ffffff',
  masyarakat: '#1a1a1a',
};
