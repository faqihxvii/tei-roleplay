import { Action, GameState, Metrics, Role } from '../types';

export const INITIAL_METRICS: Metrics = {
  mood: 7,
  kas: 7,
  chaos: 2,
  cuanPengusaha: 0,
  penaltyPengusaha: 0,
  moodEverBelow5: false
};

export const SECRET_MISSIONS: Record<Role, string> = {
  'Pemerintah': 'Pertahankan Kas Negara tetap di atas 7 di akhir game.',
  'Bank Sentral': 'Jaga Level Chaos tidak pernah menyentuh angka 7 atau lebih.',
  'Pengusaha': 'Kumpulkan 10 Token Cuan di kantong pribadi.',
  'Serikat Buruh': 'Berikan sanksi/penalty kepada Pengusaha minimal 5 kali akumulasi.',
  'Masyarakat': 'Jaga Mood Rakyat tidak pernah turun di bawah 5.'
};

export const createInitialState = (): GameState => ({
  currentYear: 1,
  maxYears: 5,
  currentRoleIndex: 0,
  metrics: { ...INITIAL_METRICS },
  history: [{
    year: 0,
    metrics: { ...INITIAL_METRICS },
    actionsTaken: {
      'Pemerintah': null,
      'Bank Sentral': null,
      'Pengusaha': null,
      'Serikat Buruh': null,
      'Masyarakat': null
    },
    feed: []
  }],
  currentTurnActions: {
    'Pemerintah': null,
    'Bank Sentral': null,
    'Pengusaha': null,
    'Serikat Buruh': null,
    'Masyarakat': null
  },
  gameOver: false,
  ending: null,
  currentScenario: null,
  currentAvailableActions: null,
  isGeneratingScenario: false,
  isGeneratingRecap: false,
  winners: []
});

export const applyActionToMetrics = (base: Metrics, action: Action): Metrics => {
  const result = { ...base };
  if (action.effects.mood !== undefined) result.mood += action.effects.mood;
  if (action.effects.kas !== undefined) result.kas += action.effects.kas;
  if (action.effects.chaos !== undefined) result.chaos += action.effects.chaos;
  if (action.effects.cuanPengusaha !== undefined) result.cuanPengusaha += action.effects.cuanPengusaha;
  if (action.effects.penaltyPengusaha !== undefined) result.penaltyPengusaha += action.effects.penaltyPengusaha;
  
  result.mood = Math.min(10, Math.max(0, result.mood));
  result.kas = Math.min(10, Math.max(0, result.kas));
  result.chaos = Math.min(10, Math.max(0, result.chaos));
  result.cuanPengusaha = Math.max(0, result.cuanPengusaha);
  result.penaltyPengusaha = Math.max(0, result.penaltyPengusaha);

  if (result.chaos >= 7) result.mood = Math.max(0, result.mood - 1); // Natural consequence of high chaos
  if (result.mood < 5) result.moodEverBelow5 = true;

  return result;
};

// Natural economic drift is replaced by simpler consequences
export const applyNaturalDrift = (base: Metrics): Metrics => {
  const result = { ...base };
  // If chaos is very high, it burns Kas and Mood slightly over time
  if (result.chaos >= 8) {
    result.mood = Math.max(0, result.mood - 1);
    result.kas = Math.max(0, result.kas - 1);
  }
  // If mood is high, it lowers chaos slightly
  if (result.mood >= 8) {
    result.chaos = Math.max(0, result.chaos - 1);
  }
  if (result.mood < 5) result.moodEverBelow5 = true;
  return result;
};

export const checkEnding = (metrics: Metrics): GameState['ending'] => {
  if (metrics.mood <= 0) return 'lengser';
  if (metrics.kas <= 0) return 'bangkrut';
  if (metrics.chaos >= 10) return 'anarki';
  return null;
};

export const checkWinners = (metrics: Metrics): Role[] => {
  const winners: Role[] = [];
  if (metrics.kas > 7) winners.push('Pemerintah');
  if (metrics.chaos < 7) winners.push('Bank Sentral');
  if (metrics.cuanPengusaha >= 10) winners.push('Pengusaha');
  if (metrics.penaltyPengusaha >= 5) winners.push('Serikat Buruh');
  if (!metrics.moodEverBelow5) winners.push('Masyarakat');
  return winners;
};
