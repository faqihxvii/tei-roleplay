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

export const ROLE_COLOR: Record<Role, string> = {
  pemerintah: '#1f2937',
  bankSentral: '#1e3a8a',
  pengusaha: '#8a4b0f',
  buruh: '#c91212',
  masyarakat: '#166534',
};
