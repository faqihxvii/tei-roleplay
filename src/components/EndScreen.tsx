import { useEffect } from 'react';
import { GameState, Role } from '../types';
import { motion } from 'motion/react';
import { SECRET_MISSIONS } from '../lib/gameEngine';
import { Trophy, Skull, RotateCcw, Sparkles } from 'lucide-react';
import { playGameOverSound, playSelectSound } from '../lib/audio';

export default function EndScreen({ state, onRestart }: { state: GameState, onRestart: () => void }) {
  const { ending, metrics, winners } = state;

  useEffect(() => {
    playGameOverSound(ending === 'survive');
  }, [ending]);

  const handleRestart = () => {
    playSelectSound();
    onRestart();
  };

  const endingConfig = {
    'survive': {
      title: 'Selamat! Negara Bertahan!',
      desc: 'Hebat! Kalian berhasil melewati 5 tahun masa jabatan tanpa membuat negara hancur. Namun, siapa yang benar-benar memenangkan misi pribadinya?',
      color: 'text-emerald-700',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200'
    },
    'lengser': {
      title: 'GAME OVER: KERUSUHAN MASSAL!',
      desc: 'Mood Rakyat menyentuh angka 0. Massa tidak puas, turun ke jalan, dan pemerintahan terpaksa diganti! Kalian gagal mempertahankan stabilitas.',
      color: 'text-rose-700',
      bg: 'bg-rose-50',
      border: 'border-rose-200'
    },
    'bangkrut': {
      title: 'GAME OVER: NEGARA BANGKRUT!',
      desc: 'Kas Negara habis sepenuhnya! Pemerintah tidak bisa mendanai fasilitas publik, utang menumpuk, dan negara dinyatakan pailit.',
      color: 'text-amber-700',
      bg: 'bg-amber-50',
      border: 'border-amber-200'
    },
    'anarki': {
      title: 'GAME OVER: KEKACAUAN TOTAL!',
      desc: 'Level Chaos mencapai puncaknya! Aturan tidak lagi berjalan, penjarahan terjadi di mana-mana, dan roda ekonomi berhenti berputar.',
      color: 'text-purple-700',
      bg: 'bg-purple-50',
      border: 'border-purple-200'
    }
  };

  const config = ending ? endingConfig[ending] : endingConfig['survive'];
  const allRoles: Role[] = ['Pemerintah', 'Bank Sentral', 'Pengusaha', 'Serikat Buruh', 'Masyarakat'];

  return (
    <div className="h-full bg-[#F3F4F6] flex flex-col items-center p-3 sm:p-5 overflow-y-auto">
      <motion.header 
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-3xl rounded-xl mb-4 border border-slate-200 bg-white p-3 flex items-center justify-between shadow-2xs shrink-0"
      >
        <div className="flex items-center gap-2.5">
          <div className="bg-[#c91212] text-white font-black text-xs px-2 py-0.5 rounded shadow-2xs">TEI</div>
          <div>
            <h1 className="text-xs sm:text-sm font-extrabold uppercase tracking-widest text-slate-900">The Economic Influence</h1>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Laporan Hasil Akhir Permainan</p>
          </div>
        </div>
      </motion.header>

      <motion.div 
        initial={{ scale: 0.98, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className={`max-w-3xl w-full p-4 sm:p-6 rounded-xl border-2 shadow-xs ${config.bg} ${config.border} text-center mb-5`}
      >
        <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/80 border border-slate-200 text-[9px] uppercase font-black tracking-widest text-slate-600 mb-2 shadow-2xs">
          <Sparkles size={11} className="text-[#c91212]" />
          Evaluasi Akhir Kepemimpinan
        </div>

        <h1 className={`text-2xl sm:text-3xl font-black uppercase tracking-tight mb-2 ${config.color}`}>
          {config.title}
        </h1>
        <p className="text-xs sm:text-sm text-slate-700 mb-4 leading-relaxed max-w-xl mx-auto font-medium">
          {config.desc}
        </p>

        <div className="grid grid-cols-3 gap-2 sm:gap-3 max-w-md mx-auto">
          <div className="bg-white p-2.5 sm:p-3 rounded-lg border border-slate-200/80 shadow-2xs">
            <div className="text-[9px] font-black uppercase text-slate-400 mb-0.5 tracking-wider">Kas Negara</div>
            <div className="text-xl sm:text-2xl font-black text-amber-600">{metrics.kas}/10</div>
          </div>
          <div className="bg-white p-2.5 sm:p-3 rounded-lg border border-slate-200/80 shadow-2xs">
            <div className="text-[9px] font-black uppercase text-slate-400 mb-0.5 tracking-wider">Mood Rakyat</div>
            <div className="text-xl sm:text-2xl font-black text-emerald-600">{metrics.mood}/10</div>
          </div>
          <div className="bg-white p-2.5 sm:p-3 rounded-lg border border-slate-200/80 shadow-2xs">
            <div className="text-[9px] font-black uppercase text-slate-400 mb-0.5 tracking-wider">Level Chaos</div>
            <div className="text-xl sm:text-2xl font-black text-rose-600">{metrics.chaos}/10</div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ y: 15, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="max-w-3xl w-full"
      >
        <div className="flex items-center gap-2 mb-4 justify-center">
          <span className="h-px bg-slate-300 flex-1 max-w-[60px]"></span>
          <h2 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Trophy size={16} className="text-amber-500" />
            Evaluasi Misi Rahasia Pemain
          </h2>
          <span className="h-px bg-slate-300 flex-1 max-w-[60px]"></span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {allRoles.map(role => {
            const isWinner = winners.includes(role);
            return (
              <div 
                key={role} 
                className={`p-3.5 rounded-xl border-2 ${
                  isWinner 
                    ? 'bg-amber-50/90 border-amber-400 shadow-xs ring-1 ring-amber-400/20' 
                    : 'bg-white border-slate-200'
                } flex items-start gap-3 transition-all`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  isWinner ? 'bg-amber-500 text-white shadow-xs' : 'bg-slate-100 text-slate-400'
                }`}>
                  {isWinner ? <Trophy size={18} /> : <Skull size={18} />}
                </div>

                <div className="text-left flex-1">
                  <div className="flex items-center justify-between mb-0.5">
                    <h3 className={`font-black uppercase tracking-wider text-xs sm:text-sm ${isWinner ? 'text-amber-900' : 'text-slate-800'}`}>
                      {role}
                    </h3>
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                      isWinner ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {isWinner ? 'MISI SUCCESS' : 'MISI FAILED'}
                    </span>
                  </div>

                  <p className={`text-[11px] leading-tight ${isWinner ? 'text-amber-900 font-semibold' : 'text-slate-500'}`}>
                    {SECRET_MISSIONS[role]}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center pb-12">
          <button
            onClick={handleRestart}
            className="bg-[#c91212] hover:bg-[#a00e0e] text-white px-8 py-3 rounded-xl font-black uppercase tracking-wider text-xs transition-all shadow-md hover:scale-105 active:scale-95 flex items-center gap-2 mx-auto cursor-pointer"
          >
            <RotateCcw size={15} />
            Main Lagi Dari Awal
          </button>
        </div>
      </motion.div>
    </div>
  );
}


