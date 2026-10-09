import { Action, Role, Metrics, Scenario } from '../types';
import { SECRET_MISSIONS } from '../lib/gameEngine';
import { playSelectSound, playConfirmSound, playTickSound, playTimeoutSound, toggleSound, isSoundEnabled } from '../lib/audio';
import { ROLE_DESIGN_TOKENS } from '../lib/theme';
import { getNationSurvivalStatus, BASELINE_THRESHOLDS } from '../lib/survivalBaseline';
import GlossaryText from './GlossaryText';
import RoleIntroModal from './RoleIntroModal';
import { useState, useEffect, useRef } from 'react';
import { 
  Eye, EyeOff, Landmark, Building2, Briefcase, Megaphone, Users, 
  Flame, Heart, Coins, ShieldAlert, CheckCircle2, Lock, Sparkles, Volume2, VolumeX,
  Clock, Activity, Info, X, AlertTriangle, ShieldCheck
} from 'lucide-react';
import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PlayScreenProps {
  currentRole: Role;
  year: number;
  metrics: Metrics;
  scenario: Scenario;
  availableActions: Action[];
  onSelectAction: (action: Action) => void;
}

const ROLES_LIST: Role[] = ['Pemerintah', 'Bank Sentral', 'Pengusaha', 'Serikat Buruh', 'Masyarakat'];

const ROLE_ICONS: Record<Role, LucideIcon> = {
  'Pemerintah': Landmark,
  'Bank Sentral': Building2,
  'Pengusaha': Briefcase,
  'Serikat Buruh': Megaphone,
  'Masyarakat': Users,
};

const CompactProgressBar = ({ label, value, color, icon: Icon, warning }: { label: string, value: number, color: string, icon: LucideIcon, warning?: boolean }) => {
  return (
    <div className="flex items-center gap-1.5 bg-slate-100/80 px-2 py-1 rounded-lg border border-slate-200/80">
      <Icon size={12} aria-hidden="true" className={clsx(warning ? "text-rose-600 animate-pulse" : "text-slate-600")} />
      <span className="text-[10px] font-black uppercase text-slate-700 tracking-wider">{label}</span>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={10}
        aria-valuenow={Math.min(10, Math.max(0, value))}
        aria-valuetext={`${value} dari 10`}
        className="w-14 sm:w-20 h-2 bg-slate-200 rounded-full overflow-hidden relative"
      >
        <motion.div 
          className={clsx("absolute top-0 left-0 h-full rounded-full", color)}
          initial={false}
          animate={{ width: `${(Math.min(10, Math.max(0, value)) / 10) * 100}%` }}
          transition={{ type: "spring", bounce: 0.1, duration: 0.4 }}
        />
      </div>
      <span className="text-[10px] font-mono font-black text-slate-900">{value}</span>
    </div>
  );
};

export default function PlayScreen({ currentRole, year, metrics, scenario, availableActions, onSelectAction }: PlayScreenProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showMission, setShowMission] = useState(false);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [timeLeft, setTimeLeft] = useState(60);
  const [timerEnabled, setTimerEnabled] = useState(true);
  const [timeoutNotice, setTimeoutNotice] = useState<string | null>(null);
  const [showIntroModal, setShowIntroModal] = useState(false);
  const [showBaselineModal, setShowBaselineModal] = useState(false);
  const introModalRef = useRef<HTMLDivElement>(null);
  const baselineModalRef = useRef<HTMLDivElement>(null);
  const introTriggerRef = useRef<HTMLButtonElement>(null);
  const baselineTriggerRef = useRef<HTMLButtonElement>(null);

  const secretMission = SECRET_MISSIONS[currentRole];
  const CurrentRoleIcon = ROLE_ICONS[currentRole];
  const roleStyle = ROLE_DESIGN_TOKENS[currentRole];
  const survival = getNationSurvivalStatus(metrics);

  // Reset turn state on role change
  useEffect(() => {
    setSelectedId(null);
    setShowMission(false);
    setTimeLeft(60);
    setTimeoutNotice(null);
  }, [currentRole, year]);

  useEffect(() => {
    const dialog: HTMLDivElement | null = showIntroModal ? introModalRef.current : showBaselineModal ? baselineModalRef.current : null;
    if (!dialog) return;

    const focusElement = (element: unknown) => {
      if (element instanceof HTMLElement) element.focus();
    };
    const returnFocusTo = showIntroModal ? introTriggerRef.current : baselineTriggerRef.current;
    const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const getFocusableElements = () => Array.from(dialog.querySelectorAll(focusableSelector)) as HTMLElement[];
    const focusableElements = getFocusableElements();
    focusElement(focusableElements[0] ?? dialog);

    const handleDialogKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const elements = getFocusableElements();
      if (elements.length === 0) {
        event.preventDefault();
        focusElement(dialog);
        return;
      }

      const first = elements[0];
      const last = elements[elements.length - 1];
      if (!first || !last) {
        event.preventDefault();
        focusElement(dialog);
        return;
      }
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        focusElement(last);
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        focusElement(first);
      }
    };

    document.addEventListener('keydown', handleDialogKeyDown);
    return () => {
      document.removeEventListener('keydown', handleDialogKeyDown);
      if (returnFocusTo?.isConnected) returnFocusTo.focus();
    };
  }, [showIntroModal, showBaselineModal]);

  // Countdown timer logic
  useEffect(() => {
    if (!timerEnabled) return;

    if (timeLeft <= 0) {
      playTimeoutSound();
      const defaultAction = selectedId 
        ? (availableActions.find(a => a.id === selectedId) || availableActions[0])
        : availableActions[0];

      if (defaultAction) {
        // Transparent, moderate penalty for timeout (Indecision penalty: -1 Mood)
        const penalizedAction: Action = {
          ...defaultAction,
          name: `[TIMEOUT] ${defaultAction.name}`,
          effects: {
            ...defaultAction.effects,
            mood: (defaultAction.effects.mood || 0) - 1
          }
        };

        setTimeoutNotice(`⏰ Waktu habis! Kebijakan otomatis diputuskan: "${defaultAction.name}". Dampak Penundaan: Mood -1 (Terganggu akibat lambat mengambil tindakan).`);
        onSelectAction(penalizedAction);
        setSelectedId(null);
      }
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        const next = prev - 1;
        if (next <= 10 && next > 0) {
          playTickSound();
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, timerEnabled, currentRole, selectedId, availableActions, onSelectAction]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSelectCard = (id: string) => {
    if (!availableActions.some(action => action.id === id)) return;
    playSelectSound();
    setSelectedId(id);
  };

  const handleToggleAudio = () => {
    const updated = toggleSound();
    setSoundOn(updated);
  };

  const handleConfirm = () => {
    if (selectedId) {
      playConfirmSound();
      const action = availableActions.find(a => a.id === selectedId);
      if (action) onSelectAction(action);
      setSelectedId(null);
    }
  };

  const renderEffectBadges = (action: Action) => {
    const badges = [];
    const { mood, kas, chaos, cuanPengusaha, penaltyPengusaha } = action.effects;

    if (mood) {
      badges.push({
        label: `Mood ${mood > 0 ? '+' : ''}${mood}`,
        positive: mood > 0,
        icon: Heart
      });
    }
    if (kas) {
      badges.push({
        label: `Kas ${kas > 0 ? '+' : ''}${kas}`,
        positive: kas > 0,
        icon: Coins
      });
    }
    if (chaos) {
      badges.push({
        label: `Chaos ${chaos > 0 ? '+' : ''}${chaos}`,
        positive: chaos < 0,
        icon: Flame
      });
    }
    if (cuanPengusaha) {
      badges.push({
        label: `Cuan ${cuanPengusaha > 0 ? '+' : ''}${cuanPengusaha}`,
        positive: cuanPengusaha > 0,
        icon: Sparkles
      });
    }
    if (penaltyPengusaha) {
      badges.push({
        label: `Penalty ${penaltyPengusaha > 0 ? '+' : ''}${penaltyPengusaha}`,
        positive: penaltyPengusaha < 0,
        icon: ShieldAlert
      });
    }

    return badges;
  };

  const activeRoleIndex = ROLES_LIST.indexOf(currentRole);

  return (
    <div className="h-full w-full bg-[#F3F4F6] overflow-y-auto flex flex-col items-center relative">
      {/* Role Introduction Modal */}
      {showIntroModal && (
        <RoleIntroModal
          modalRef={introModalRef}
          onClose={() => setShowIntroModal(false)}
          onStartGame={() => setShowIntroModal(false)}
        />
      )}

      {/* Baseline Health Detail Modal */}
      {showBaselineModal && (
          <div
            ref={baselineModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="baseline-modal-title"
            tabIndex={-1}
            onKeyDown={event => {
              if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                setShowBaselineModal(false);
              }
            }}
            className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4 outline-none"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <Activity size={18} aria-hidden="true" className="text-[#c91212]" />
                  <h3 id="baseline-modal-title" className="font-black uppercase text-sm text-slate-900">Batas Aman Ketahanan Negara</h3>
                </div>
                <button
                  type="button"
                  aria-label="Tutup laporan ketahanan negara"
                  onClick={() => setShowBaselineModal(false)}
                  className="min-h-10 min-w-10 text-slate-600 hover:text-slate-900 hover:bg-slate-100 p-2 rounded-lg cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-700">
                <div className={clsx("p-3 rounded-xl border flex items-center justify-between", survival.bgLight, survival.borderColor)}>
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">Status Terkini</span>
                    <strong className={clsx("text-sm font-black uppercase", survival.status === 'STABIL' ? 'text-emerald-700' : survival.status === 'WASPADA' ? 'text-amber-700' : 'text-rose-700')}>
                      {survival.label}
                    </strong>
                  </div>
                  <div className="text-right font-mono font-black text-lg text-slate-900">
                    {survival.healthPercentage}%
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <p className="text-[11px] text-slate-500 font-semibold">
                    Negara dinyatakan <strong className="text-emerald-700">SURVIVE</strong> jika seluruh indikator utama tetap bertahan di atas ambang batas kritis selama 5 tahun.
                  </p>

                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1.5 font-mono text-[11px]">
                    <div className="flex justify-between items-center">
                      <span>💰 Kas Negara:</span>
                      <span className={clsx("font-bold", metrics.kas < BASELINE_THRESHOLDS.kasMin ? "text-rose-600" : "text-emerald-600")}>
                        {metrics.kas}/10 (Min: {BASELINE_THRESHOLDS.kasMin})
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>❤️ Mood Rakyat:</span>
                      <span className={clsx("font-bold", metrics.mood < BASELINE_THRESHOLDS.moodMin ? "text-rose-600" : "text-emerald-600")}>
                        {metrics.mood}/10 (Min: {BASELINE_THRESHOLDS.moodMin})
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>🔥 Chaos Level:</span>
                      <span className={clsx("font-bold", metrics.chaos > BASELINE_THRESHOLDS.chaosMax ? "text-rose-600" : "text-emerald-600")}>
                        {metrics.chaos}/10 (Maks: {BASELINE_THRESHOLDS.chaosMax})
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-lg text-rose-800 text-[11px] flex gap-2 items-start">
                  <AlertTriangle size={15} className="shrink-0 text-rose-600 mt-0.5" />
                  <span>
                    Jika Kas/Mood menyentuh <strong>0</strong> atau Chaos menyentuh <strong>10</strong>, negara langsung <strong>AMBRUK / GAME OVER</strong>.
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowBaselineModal(false)}
                className="w-full min-h-11 bg-slate-900 hover:bg-slate-800 text-white py-2 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
              >
                Tutup Laporan
              </button>
            </motion.div>
          </div>
      )}

      {/* Top Header + Compact Dashboard Bar */}
      <motion.div 
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full bg-white border-b border-gray-200 px-3 py-2 flex items-center justify-between shrink-0 shadow-2xs sticky top-0 z-40 gap-2 overflow-x-auto"
      >
        <div className="flex items-center gap-2 shrink-0">
          <div className="bg-[#c91212] text-white font-black text-xs px-2 py-0.5 rounded shadow-xs">TEI</div>
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
            Tahun {year}/5
          </span>

          {/* Turn Timer Countdown */}
          {timerEnabled ? (
            <div
              role="timer"
              aria-label={`Sisa waktu ${formatTime(timeLeft)}`}
              className={clsx(
                "flex items-center gap-1 font-mono text-[11px] font-black px-2 py-0.5 rounded-md border shadow-2xs transition-colors shrink-0",
                timeLeft <= 10
                  ? "bg-rose-600 text-white border-rose-700 animate-pulse"
                  : timeLeft <= 20
                    ? "bg-amber-500 text-white border-amber-600"
                    : "bg-slate-900 text-white border-slate-800"
              )}
            >
              <Clock size={12} aria-hidden="true" />
              <span>{formatTime(timeLeft)}</span>
            </div>
          ) : (
            <span role="status" aria-live="polite" className="text-[10px] font-bold text-slate-600">
              Timer nonaktif
            </span>
          )}

          <button
            type="button"
            aria-label={timerEnabled ? 'Matikan timer' : 'Aktifkan timer'}
            aria-pressed={timerEnabled}
            onClick={() => setTimerEnabled(enabled => !enabled)}
            className="min-h-10 min-w-10 p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
            title={timerEnabled ? 'Matikan batas waktu giliran' : 'Aktifkan batas waktu giliran'}
          >
            <Clock size={14} aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={handleToggleAudio}
            aria-label={soundOn ? 'Matikan suara' : 'Aktifkan suara'}
            aria-pressed={soundOn}
            className="min-h-10 min-w-10 p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          >
            {soundOn ? <Volume2 size={14} aria-hidden="true" className="text-[#c91212]" /> : <VolumeX size={14} aria-hidden="true" className="text-slate-500" />}
          </button>
        </div>

        {/* HUD Indicator Meters & National Survival Indicator */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Survival Status Badge */}
          <button
            ref={baselineTriggerRef}
            type="button"
            aria-label={`Detail ketahanan negara: ${survival.status}, ${survival.healthPercentage}%`}
            onClick={() => setShowBaselineModal(true)}
            className={clsx(
              "flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg border shadow-2xs cursor-pointer transition-all hover:scale-[1.02] shrink-0",
              survival.badgeBg,
              survival.badgeText
            )}
            title="Klik untuk detail ambang batas ketahanan negara"
          >
            <Activity size={12} aria-hidden="true" />
            <span className="hidden sm:inline">{survival.status}</span>
            <span>({survival.healthPercentage}%)</span>
          </button>

          <button
            ref={introTriggerRef}
            type="button"
            aria-label="Buka panduan peran"
            onClick={() => setShowIntroModal(true)}
            className="flex items-center gap-1 text-[10px] font-black uppercase text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2 py-1 rounded-lg transition-colors cursor-pointer shrink-0"
            title="Buka Panduan Peran"
          >
            <Info size={12} aria-hidden="true" className="text-[#c91212]" />
            <span className="hidden md:inline">Peran</span>
          </button>

          <CompactProgressBar label="Mood" value={metrics.mood} color="bg-emerald-500" icon={Heart} warning={metrics.mood <= 3} />
          <CompactProgressBar label="Kas" value={metrics.kas} color="bg-amber-500" icon={Coins} warning={metrics.kas <= 3} />
          <CompactProgressBar label="Chaos" value={metrics.chaos} color="bg-rose-500" icon={Flame} warning={metrics.chaos >= 7} />
        </div>
      </motion.div>

      {/* Role Progress Steps Bar */}
      <div className="w-full max-w-5xl px-3 pt-3">
        <div role="list" aria-label="Urutan peran pemain" className="bg-white border border-slate-200/80 rounded-xl p-1.5 shadow-2xs flex items-center justify-between overflow-x-auto gap-1">
          <div className="flex items-center gap-1 shrink-0 w-full justify-between">
            {ROLES_LIST.map((role, idx) => {
              const isCurrent = role === currentRole;
              const isPast = idx < activeRoleIndex;
              const RoleIcon = ROLE_ICONS[role];

              return (
                <div
                  key={role}
                  role="listitem"
                  aria-current={isCurrent ? 'step' : undefined}
                  className={clsx(
                    "flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black transition-all flex-1 text-center shrink-0 min-w-max",
                    isCurrent 
                      ? "bg-[#c91212] text-white shadow-xs scale-[1.02]" 
                      : isPast 
                      ? "bg-slate-100 text-slate-400 line-through" 
                      : "bg-slate-50 text-slate-600 border border-slate-200/60"
                  )}
                >
                  <RoleIcon size={12} aria-hidden="true" className={isCurrent ? "text-white" : "text-slate-500"} />
                  <span>{role}</span>
                  {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse ml-0.5"></span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Timeout Alert Toast Banner */}
      <AnimatePresence>
        {timeoutNotice && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full max-w-5xl px-3 pt-2"
          >
            <div role="alert" className="bg-rose-600 text-white px-3 py-2 rounded-xl text-xs font-black flex items-center justify-between shadow-md">
              <span className="flex items-center gap-1.5">
                <AlertTriangle size={14} aria-hidden="true" className="animate-bounce shrink-0" />
                {timeoutNotice}
              </span>
              <button type="button" aria-label="Tutup notifikasi waktu habis" onClick={() => setTimeoutNotice(null)} className="min-h-10 min-w-10 text-white/90 hover:text-white cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area with Smooth Role Transition */}
      <AnimatePresence mode="wait">
        <motion.div 
          key={currentRole}
          initial={{ opacity: 0, y: 12, filter: 'blur(2px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -12, filter: 'blur(2px)' }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="w-full max-w-5xl space-y-3 p-3 sm:p-4"
        >
          {/* Transition Role Alert Indicator */}
          <div role="status" aria-live="polite" className="flex items-center justify-between bg-slate-900/90 text-white px-3 py-1.5 rounded-lg border border-slate-800 text-[10px] font-black uppercase tracking-wider shadow-2xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#c91212] animate-ping"></span>
              <span>GILIRAN SEKARANG: <span className="text-amber-400 font-extrabold">{currentRole}</span></span>
            </div>
            <div className="flex items-center gap-3 text-slate-300 text-[9px] font-mono">
              <span className="hidden sm:inline">Pemain {activeRoleIndex + 1} dari 5</span>
              <span className="text-rose-400 font-bold flex items-center gap-1">
                <Clock size={11} aria-hidden="true" /> {timeLeft}s
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Scenario Headline Box */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, delay: 0.05 }}
              className="md:col-span-2 bg-slate-900 relative rounded-xl overflow-hidden p-4 sm:p-5 flex flex-col justify-between shadow-xs border border-slate-800 text-white"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/90 to-slate-800/50"></div>
              <div className="relative z-10 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="bg-[#c91212] text-white text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded shadow-xs flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                    BERITA UTAMA HARIAN
                  </span>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Ronde {year}</span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-white leading-tight tracking-tight">
                  <GlossaryText text={scenario.title} />
                </h2>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                  <GlossaryText text={scenario.description} />
                </p>
              </div>

              <div className="relative z-10 pt-3 mt-3 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-bold text-slate-400">
                <span className="text-white flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#c91212]"></span>
                  TEI REDAKSI UTAMA
                </span>
                <span>Laporan Situasi Nasional</span>
              </div>
            </motion.div>

            {/* Active Player Box */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, delay: 0.1 }}
              className={clsx(
                "p-4 rounded-xl border shadow-2xs flex flex-col justify-between transition-all space-y-3",
                roleStyle.cardBg,
                roleStyle.cardBorder
              )}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] text-slate-500 uppercase tracking-widest font-black">Giliran Pemain</span>
                  <span className={clsx("text-[9px] font-black text-white px-2 py-0.5 rounded uppercase tracking-wider", roleStyle.badgeBg)}>
                    Pemain #{activeRoleIndex + 1}
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className={clsx("w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-xs shrink-0", roleStyle.badgeBg)}>
                    <CurrentRoleIcon size={20} aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 tracking-tight">{currentRole}</h3>
                    <p className="text-[10px] text-slate-600 font-semibold">Pengambil Kebijakan</p>
                  </div>
                </div>
              </div>

              {/* Secret Mission Box */}
              <div className="bg-white/90 border border-slate-200 p-2.5 rounded-lg shadow-2xs">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[9px] uppercase font-black text-slate-500 tracking-wider flex items-center gap-1">
                    <Lock size={11} className="text-rose-600" />
                    Misi Rahasia Anda
                  </p>
                  <button
                    type="button"
                    aria-expanded={showMission}
                    aria-controls="secret-mission-text"
                    onClick={() => setShowMission(!showMission)}
                    className="min-h-10 px-2 text-slate-700 hover:text-slate-900 transition-colors flex items-center gap-1 text-[9px] font-black cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                  >
                    {showMission ? <EyeOff size={12} aria-hidden="true" /> : <Eye size={12} aria-hidden="true" />}
                    <span>{showMission ? 'Sembunyikan' : 'Buka'}</span>
                  </button>
                </div>
                <p id="secret-mission-text" className={clsx("text-xs font-semibold text-slate-800 leading-snug transition-all duration-200", !showMission && "blur-xs select-none opacity-40")}>
                  {secretMission}
                </p>
              </div>

              {(currentRole === 'Pengusaha' || currentRole === 'Serikat Buruh') && (
                <div className="bg-white/80 p-2 rounded-lg border border-slate-200/80 flex items-center justify-between text-xs font-black text-slate-700">
                  <span className="flex items-center gap-1 text-[11px]">💰 Cuan: <span className="text-amber-600 font-black">{metrics.cuanPengusaha}</span></span>
                  <span className="flex items-center gap-1 text-[11px]">🚨 Penalty: <span className="text-rose-600 font-black">{metrics.penaltyPengusaha}</span></span>
                </div>
              )}
            </motion.div>
          </div>

          {/* Action Selection Deck */}
          <motion.section
            aria-labelledby="policy-selection-heading"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.2, delay: 0.15 }}
            className="pt-1"
          >
            <div className="flex items-center gap-2 mb-2.5 justify-center">
              <span className="h-px bg-slate-300 flex-1 max-w-[80px]"></span>
              <p id="policy-selection-heading" className="text-[10px] font-black text-slate-600 uppercase tracking-widest text-center flex items-center gap-1">
                <Sparkles size={12} className="text-[#c91212]" />
                PILIH KARTU KEBIJAKAN EKONOMI
              </p>
              <span className="h-px bg-slate-300 flex-1 max-w-[80px]"></span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {availableActions.map((action, actionIdx) => {
                const isSelected = selectedId === action.id;
                const effectBadges = renderEffectBadges(action);

                return (
                  <motion.button
                    key={action.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, delay: 0.12 + actionIdx * 0.05 }}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => handleSelectCard(action.id)}
                    className={clsx(
                      "text-left p-3.5 sm:p-4 rounded-xl transition-all duration-150 shadow-2xs flex flex-col justify-between border-2 relative overflow-hidden cursor-pointer",
                      isSelected 
                        ? "bg-white border-[#c91212] ring-2 ring-[#c91212]/20 shadow-md" 
                        : "bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-xs"
                    )}
                  >
                    {isSelected && (
                      <div className="absolute top-0 right-0 bg-[#c91212] text-white px-2 py-0.5 rounded-bl text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 size={10} aria-hidden="true" />
                        DIPILIH
                      </div>
                    )}

                    <div>
                      <h4 className={clsx("font-black text-sm mb-1 leading-snug pr-8", isSelected ? "text-[#c91212]" : "text-slate-900")}>
                        <GlossaryText text={action.name} />
                      </h4>
                      <p className="text-xs text-slate-600 leading-normal font-medium">
                        <GlossaryText text={action.description} />
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100">
                      <p className="text-[10px] font-black uppercase text-slate-600 tracking-wider mb-1">Estimasi Dampak:</p>
                      <div className="flex flex-wrap gap-1">
                        {effectBadges.map((badge, bIdx) => {
                          const BadgeIcon = badge.icon;
                          return (
                            <span 
                              key={bIdx}
                              className={clsx(
                                "text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5",
                                badge.positive 
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                                  : "bg-rose-50 text-rose-700 border border-rose-200"
                              )}
                            >
                              <BadgeIcon size={10} />
                              {badge.label}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.section>

          {/* Sahkan Kebijakan Button */}
          <div className="pt-2 pb-6 flex justify-center">
            <button
              onClick={handleConfirm}
              disabled={!selectedId}
              className={clsx(
                "w-full max-w-sm py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-md",
                selectedId 
                  ? "bg-[#c91212] hover:bg-[#a00e0e] text-white hover:scale-[1.02] active:scale-[0.98]" 
                  : "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-200"
              )}
            >
              <CheckCircle2 size={15} aria-hidden="true" />
              {selectedId ? 'Sahkan Kebijakan Ini' : 'Pilih Salah Satu Kebijakan'}
            </button>
          </div>

        </motion.div>
      </AnimatePresence>
    </div>
  );
}
