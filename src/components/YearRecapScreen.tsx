import { useEffect } from 'react';
import { GameState } from '../types';
import { motion } from 'motion/react';
import { Heart, Repeat2, MessageCircle, Sparkles, CheckCircle, ArrowRight, Activity, ShieldAlert, ShieldCheck, AlertTriangle } from 'lucide-react';
import { playTurnEndSound, playSelectSound } from '../lib/audio';
import { getNationSurvivalStatus, BASELINE_THRESHOLDS } from '../lib/survivalBaseline';

interface YearRecapScreenProps {
  state: GameState;
  onNextYear: () => void;
}

export default function YearRecapScreen({ state, onNextYear }: YearRecapScreenProps) {
  const lastRecord = state.history[state.history.length - 1];
  const survival = getNationSurvivalStatus(state.metrics);

  useEffect(() => {
    playTurnEndSound();
  }, []);

  const handleNext = () => {
    playSelectSound();
    onNextYear();
  };

  return (
    <div className="h-full bg-[#F3F4F6] flex flex-col overflow-hidden">
      <motion.header 
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-3 sm:px-6 shrink-0 shadow-2xs sticky top-0 z-20"
      >
        <div className="flex items-center gap-2.5">
          <div className="bg-[#c91212] text-white font-black text-xs px-2 py-0.5 rounded shadow-2xs">TEI FEED</div>
          <div>
            <h1 className="text-sm sm:text-base font-black uppercase tracking-tight text-slate-900">Suara Netizen & Media (Tahun {state.currentYear})</h1>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest hidden sm:block">Reaksi Langsung Atas Kebijakan</p>
          </div>
        </div>

        <button
          onClick={handleNext}
          className="bg-[#c91212] hover:bg-[#a00e0e] text-white px-4 py-2 rounded-xl font-black uppercase tracking-wider text-xs transition-all shadow-xs hover:scale-105 active:scale-95 flex items-center gap-1.5 cursor-pointer"
        >
          <span>{state.gameOver ? 'Evaluasi Akhir' : `Tahun ${state.currentYear + 1}`}</span>
          <ArrowRight size={13} />
        </button>
      </motion.header>

      <main className="flex-1 overflow-y-auto p-3 sm:p-5 flex justify-center bg-slate-100">
        <div className="w-full max-w-xl space-y-3 pb-8">
          
          {/* National Survival Baseline Card */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-xl border-2 shadow-2xs ${survival.bgLight} ${survival.borderColor}`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Activity size={16} className={survival.status === 'STABIL' ? 'text-emerald-600' : survival.status === 'WASPADA' ? 'text-amber-600' : 'text-rose-600'} />
                <span className="text-xs font-black uppercase tracking-wider text-slate-900">Laporan Baseline Ketahanan Negara</span>
              </div>
              <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${survival.badgeBg} ${survival.badgeText}`}>
                {survival.status} ({survival.healthPercentage}%)
              </span>
            </div>

            <p className="text-xs font-medium text-slate-700 mb-3 leading-relaxed">
              {survival.description}
            </p>

            <div className="grid grid-cols-3 gap-2 bg-white/90 p-2.5 rounded-lg border border-slate-200 text-center font-mono text-xs">
              <div className="border-r border-slate-100 pr-1">
                <span className="text-[9px] font-sans font-bold text-slate-400 block uppercase">Kas Negara</span>
                <span className={`font-black text-sm ${state.metrics.kas < BASELINE_THRESHOLDS.kasMin ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {state.metrics.kas}/10
                </span>
                <span className="text-[8px] font-sans text-slate-400 block">(Batas: ≥{BASELINE_THRESHOLDS.kasMin})</span>
              </div>
              <div className="border-r border-slate-100 pr-1">
                <span className="text-[9px] font-sans font-bold text-slate-400 block uppercase">Mood Rakyat</span>
                <span className={`font-black text-sm ${state.metrics.mood < BASELINE_THRESHOLDS.moodMin ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {state.metrics.mood}/10
                </span>
                <span className="text-[8px] font-sans text-slate-400 block">(Batas: ≥{BASELINE_THRESHOLDS.moodMin})</span>
              </div>
              <div>
                <span className="text-[9px] font-sans font-bold text-slate-400 block uppercase">Level Chaos</span>
                <span className={`font-black text-sm ${state.metrics.chaos > BASELINE_THRESHOLDS.chaosMax ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {state.metrics.chaos}/10
                </span>
                <span className="text-[8px] font-sans text-slate-400 block">(Batas: ≤{BASELINE_THRESHOLDS.chaosMax})</span>
              </div>
            </div>
          </motion.div>

          {/* Header Sentiment Radar */}
          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="text-xs font-black uppercase tracking-wider text-slate-700">Trending Topic: #EkonomiTahun{state.currentYear}</span>
            </div>
            <span className="text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold uppercase">
              1,240,000 Posts
            </span>
          </div>


          {lastRecord && lastRecord.feed && lastRecord.feed.map((post, idx) => (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 * idx }}
              key={idx}
              className="bg-white p-3.5 sm:p-4 rounded-xl shadow-2xs border border-slate-200/80 flex gap-3 hover:border-slate-300 transition-all"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-500 to-[#c91212] text-white flex items-center justify-center shrink-0 shadow-xs font-black text-sm">
                 {post.author.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-slate-900 text-xs sm:text-sm">{post.author}</span>
                    <CheckCircle size={12} className="text-sky-500 fill-sky-500/10" />
                    <span className="text-[10px] font-medium text-slate-400">{post.handle}</span>
                  </div>
                  <span className="text-[9px] text-slate-400 font-mono">Baru saja</span>
                </div>

                <p className="text-slate-800 leading-normal text-xs sm:text-sm font-medium mb-2.5">
                  {post.content}
                </p>

                <div className="flex items-center gap-5 text-slate-400 text-[11px] font-bold pt-2 border-t border-slate-100">
                  <span className="flex items-center gap-1 hover:text-rose-600 cursor-pointer transition-colors">
                    <Heart size={13} className="hover:fill-rose-600" />
                    <span>{post.likes}</span>
                  </span>
                  <span className="flex items-center gap-1 hover:text-emerald-600 cursor-pointer transition-colors">
                    <Repeat2 size={13} />
                    <span>{post.retweets}</span>
                  </span>
                  <span className="flex items-center gap-1 hover:text-sky-600 cursor-pointer transition-colors">
                    <MessageCircle size={13} />
                    <span>{Math.floor(post.likes / 3)}</span>
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
          
          {/* Status HUD summary */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-slate-900 text-white p-4 sm:p-5 rounded-xl shadow-md mt-4 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3"
          >
             <div>
               <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1 flex items-center gap-1">
                 <Sparkles size={11} className="text-amber-400" />
                 Status Indikator Pasca Ronde {state.currentYear}
               </p>
               <div className="flex gap-4 items-center">
                 <span className="font-mono text-xs font-bold text-emerald-400 flex items-center gap-1">
                   Mood: <span className="text-sm font-black text-white">{state.metrics.mood}/10</span>
                 </span>
                 <span className="font-mono text-xs font-bold text-amber-400 flex items-center gap-1">
                   Kas: <span className="text-sm font-black text-white">{state.metrics.kas}/10</span>
                 </span>
                 <span className="font-mono text-xs font-bold text-rose-400 flex items-center gap-1">
                   Chaos: <span className="text-sm font-black text-white">{state.metrics.chaos}/10</span>
                 </span>
               </div>
             </div>

             <button
               onClick={handleNext}
               className="w-full sm:w-auto bg-[#c91212] hover:bg-[#a00e0e] text-white px-5 py-2.5 rounded-xl font-black uppercase tracking-wider text-xs transition-all shadow-xs cursor-pointer shrink-0"
             >
               {state.gameOver ? 'Lihat Hasil Akhir' : 'Mulai Ronde Berikutnya'}
             </button>
          </motion.div>

        </div>
      </main>
    </div>
  );
}


