export type Role = 'Pemerintah' | 'Bank Sentral' | 'Pengusaha' | 'Serikat Buruh' | 'Masyarakat';

export interface Metrics {
  mood: number; // 1-10 (0 = Lengser)
  kas: number; // 1-10 (0 = Bangkrut)
  chaos: number; // 1-10 (10 = Anarki)
  cuanPengusaha: number; 
  penaltyPengusaha: number;
  moodEverBelow5: boolean;
}

export interface Action {
  id: string;
  name: string;
  description: string;
  effects: Partial<Metrics>;
}

export interface FeedPost {
  author: string;
  handle: string;
  content: string;
  likes: number;
  retweets: number;
}

export interface TurnRecord {
  year: number;
  metrics: Metrics;
  actionsTaken: Record<Role, Action | null>;
  feed: FeedPost[];
}

export interface Scenario {
  title: string;
  description: string;
}

export interface GameState {
  currentYear: number;
  maxYears: number;
  currentRoleIndex: number;
  metrics: Metrics;
  history: TurnRecord[];
  currentTurnActions: Record<Role, Action | null>;
  gameOver: boolean;
  ending: 'lengser' | 'bangkrut' | 'anarki' | 'survive' | null;
  currentScenario: Scenario | null;
  currentAvailableActions: Record<Role, Action[]> | null;
  isGeneratingScenario: boolean;
  isGeneratingRecap: boolean;
  winners: Role[];
}

