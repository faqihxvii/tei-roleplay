// Design System Tokens for The Economic Influence (TEI)

export const designTokens = {
  colors: {
    brand: {
      primary: '#C91212',
      primaryHover: '#A00E0E',
      primaryLight: '#FEF2F2',
      primaryBorder: '#FECDD3',
    },
    neutral: {
      canvas: '#F8FAFC',
      surface: '#FFFFFF',
      surfaceMuted: '#F1F5F9',
      border: '#E2E8F0',
      borderDark: '#1E293B',
      textMain: '#0F172A',
      textMuted: '#64748B',
      darkCanvas: '#0F172A',
    },
    semantic: {
      success: {
        main: '#059669',
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
      },
      warning: {
        main: '#D97706',
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        border: 'border-amber-200',
      },
      danger: {
        main: '#C91212',
        bg: 'bg-rose-50',
        text: 'text-rose-700',
        border: 'border-rose-200',
      },
      info: {
        main: '#2563EB',
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        border: 'border-blue-200',
      }
    },
  },
  typography: {
    fontFamily: {
      sans: 'font-sans',
      mono: 'font-mono',
    },
    size: {
      badge: 'text-[9px]',
      caption: 'text-[10px]',
      bodySm: 'text-xs',
      body: 'text-sm',
      titleSm: 'text-base',
      title: 'text-lg',
      display: 'text-xl sm:text-2xl',
    }
  },
  radii: {
    sm: 'rounded-md',
    md: 'rounded-lg',
    lg: 'rounded-xl',
    xl: 'rounded-2xl',
    full: 'rounded-full',
  },
  shadows: {
    xs: 'shadow-2xs',
    sm: 'shadow-xs',
    md: 'shadow-md',
    lg: 'shadow-lg',
  }
};

export const ROLE_DESIGN_TOKENS = {
  'Pemerintah': {
    badgeBg: 'bg-slate-900',
    badgeText: 'text-white',
    cardBg: 'bg-slate-50/90',
    cardBorder: 'border-slate-200/90',
    iconBg: 'bg-slate-900',
    accentColor: '#0F172A',
  },
  'Bank Sentral': {
    badgeBg: 'bg-slate-800',
    badgeText: 'text-white',
    cardBg: 'bg-slate-50/90',
    cardBorder: 'border-slate-200/90',
    iconBg: 'bg-slate-800',
    accentColor: '#1E293B',
  },
  'Pengusaha': {
    badgeBg: 'bg-slate-900',
    badgeText: 'text-white',
    cardBg: 'bg-slate-50/90',
    cardBorder: 'border-slate-200/90',
    iconBg: 'bg-slate-900',
    accentColor: '#0F172A',
  },
  'Serikat Buruh': {
    badgeBg: 'bg-[#C91212]',
    badgeText: 'text-white',
    cardBg: 'bg-rose-50/50',
    cardBorder: 'border-rose-200/80',
    iconBg: 'bg-[#C91212]',
    accentColor: '#C91212',
  },
  'Masyarakat': {
    badgeBg: 'bg-slate-800',
    badgeText: 'text-white',
    cardBg: 'bg-slate-50/90',
    cardBorder: 'border-slate-200/90',
    iconBg: 'bg-slate-800',
    accentColor: '#1E293B',
  },
};
