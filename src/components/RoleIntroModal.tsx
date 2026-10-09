import { motion } from 'motion/react';
import type { RefObject } from 'react';
import { Landmark, Building2, Briefcase, Megaphone, Users, ShieldAlert, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Role } from '../types';
import type { LucideIcon } from 'lucide-react';
import { ROLE_INFO } from '../lib/gameData';
import { ROLE_DESIGN_TOKENS } from '../lib/theme';

interface RoleIntroModalProps {
  modalRef: RefObject<HTMLDivElement | null>;
  onClose: () => void;
  onStartGame: () => void;
}

const ROLE_ICONS: Record<Role, LucideIcon> = {
  'Pemerintah': Landmark,
  'Bank Sentral': Building2,
  'Pengusaha': Briefcase,
  'Serikat Buruh': Megaphone,
  'Masyarakat': Users,
};

const ROLES_ORDER: Role[] = ['Pemerintah', 'Bank Sentral', 'Pengusaha', 'Serikat Buruh', 'Masyarakat'];

export default function RoleIntroModal({ modalRef, onClose, onStartGame }: RoleIntroModalProps) {
  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="role-intro-title"
      aria-describedby="role-intro-description"
      tabIndex={-1}
      onKeyDown={event => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }
      }}
      className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto outline-none"
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl space-y-4 my-auto"
      >
        {/* Header */}
        <div className="text-center space-y-1.5 border-b border-slate-100 pb-3">
          <div className="inline-flex items-center gap-1.5 bg-slate-900 text-white text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider">
            <Sparkles size={11} aria-hidden="true" className="text-amber-400" />
            Panduan & Misi Publik Peran
          </div>
          <h2 id="role-intro-title" className="text-lg sm:text-xl font-black uppercase tracking-tight text-slate-900">
            5 Peran Utama Penggerak Ekonomi Nasional
          </h2>
          <p id="role-intro-description" className="text-xs text-slate-600 font-medium max-w-lg mx-auto">
            Setiap pemain memegang satu peran penting dalam menentukan arah kebijakan negara.
          </p>
        </div>

        {/* Roles Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[55vh] overflow-y-auto pr-1">
          {ROLES_ORDER.map((role, idx) => {
            const Icon = ROLE_ICONS[role];
            const info = ROLE_INFO[role];
            const token = ROLE_DESIGN_TOKENS[role];

            return (
              <div 
                key={role}
                className={`${token.cardBg} ${token.cardBorder} border p-3 rounded-xl flex items-start gap-2.5 hover:border-slate-300 transition-colors`}
              >
                <div className={`w-8 h-8 rounded-lg ${token.iconBg} text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5`}>
                  <Icon size={16} aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 truncate">{role}</h3>
                    <span className="text-[9px] font-bold text-slate-400 bg-slate-200/80 px-1.5 py-0.2 rounded font-mono">
                      #{idx + 1}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-700 leading-snug font-medium mb-1">
                    <strong className="text-slate-900 font-bold">Fokus Utama:</strong> {info.goal}
                  </p>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    <strong className="text-slate-600 font-semibold">Tantangan:</strong> {info.challenge}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Secret Mission Notice */}
        <div className="bg-amber-50 border border-amber-200/90 p-3 rounded-xl flex items-start gap-2 text-amber-900 text-xs">
          <ShieldAlert size={16} aria-hidden="true" className="text-amber-600 shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed">
            <strong className="font-extrabold uppercase tracking-wider block text-[10px] text-amber-800">Misi Rahasia Tersembunyi:</strong>
            Selain tujuan umum di atas, tiap peran memiliki <strong className="font-extrabold">Misi Rahasia Khusus</strong> yang hanya akan tampil secara rahasia di layar giliran masing-masing. Jaga kerahasiaan misi Anda!
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={onStartGame}
          className="w-full bg-[#c91212] hover:bg-[#a00e0e] text-white py-3 rounded-xl font-black uppercase tracking-wider text-xs transition-all shadow-md hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
        >
          <CheckCircle2 size={16} aria-hidden="true" />
          <span>Saya Paham, Mulai Simulasi Ekonomi</span>
          <ArrowRight size={14} aria-hidden="true" />
        </button>
      </motion.div>
    </div>
  );
}
