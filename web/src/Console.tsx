import { useEffect, useState } from 'react';
import { ROLE_LABEL } from '../../engine/src/content/roles';
import { ROLES, type AgendaId, type Decision, type Role } from '../../engine/src/types';
import type { ClientMessage } from '../../room/src/protocol';
import type { HostView } from '../../room/src/views';
import { ExportPanel } from './Debrief';
import { avSettings, useAudioStatus, useAvSettings } from './audio/settings';
import { DecisionForm } from './DecisionForm';
import { SurveyResults } from './Survey';
import { RoleName } from './shared';

// Facilitator console: an overlay on the host laptop, toggled with K (GDD, "UX/UI"). Full control of
// the clock, plus decisions for teams nobody plays (Mode tanpa HP) or a team that is stuck.

type Send = (message: ClientMessage) => void;

export function useConsoleToggle(): [boolean, (open: boolean) => void] {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement;
      if (!typing && e.key.toLowerCase() === 'k' && !e.metaKey && !e.ctrlKey) setOpen(o => !o);
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return [open, setOpen];
}

export function ClockControls({ view, send }: { view: HostView; send: Send }) {
  const running = view.phaseEndsAt !== null;
  const paused = view.pausedMs !== null;
  return (
    <div className="row">
      {running && <button className="btn" onClick={() => send({ t: 'pause' })}>Jeda</button>}
      {paused && <button className="btn primary" onClick={() => send({ t: 'resume-clock' })}>Lanjutkan</button>}
      {(running || paused) && <button className="btn" onClick={() => send({ t: 'addTime' })}>+30 detik</button>}
      {(view.phase === 'briefing' || view.phase === 'tahun' || view.phase === 'tebak') && (
        <button className="btn" onClick={() => send({ t: 'next' })}>Lewati fase →</button>
      )}
    </div>
  );
}

/** Master volume and mute (GDD: in the facilitator console), plus the main screen's own motion switch. */
export function AvControls({ compact = false }: { compact?: boolean }) {
  const av = useAvSettings();
  const status = useAudioStatus();
  const note = status.state === 'kosong' ? 'Belum ada file suara terpasang. Permainan tetap utuh tanpa suara.'
    : status.state === 'siap' ? `${status.sfx} efek suara dan ${status.music} musik terpasang.` : 'Memeriksa file suara…';
  if (compact) {
    return (
      <label className="toggle">
        <input type="checkbox" checked={!av.muted} onChange={e => avSettings.set({ muted: !e.target.checked })} />
        <span>Suara di layar utama</span>
      </label>
    );
  }
  return (
    <div className="av-controls">
      <button className={`btn${av.muted ? ' primary' : ''}`} onClick={() => avSettings.set({ muted: !av.muted })} aria-pressed={av.muted}>
        {av.muted ? 'Bunyikan' : 'Bisukan'}
      </button>
      <input type="range" min={0} max={100} step={5} value={Math.round(av.volume * 100)} aria-label="Volume utama"
        onChange={e => avSettings.set({ volume: Number(e.target.value) / 100 })} disabled={av.muted} />
      <span className="timer" aria-hidden="true">{Math.round(av.volume * 100)}</span>
      <label className="toggle"><input type="checkbox" checked={av.music} onChange={e => avSettings.set({ music: e.target.checked })} /> Musik</label>
      <label className="toggle"><input type="checkbox" checked={av.sfx} onChange={e => avSettings.set({ sfx: e.target.checked })} /> Efek suara</label>
      <span />
      <label className="toggle av-note"><input type="checkbox" checked={av.reducedMotion} onChange={e => avSettings.set({ reducedMotion: e.target.checked })} /> Kurangi gerak di layar utama (animasi diganti potong atau pudar)</label>
      <p className="muted small av-note">{note} HP pemain selalu senyap dan hanya bergetar.</p>
    </div>
  );
}

export function Console({ view, send, onClose }: { view: HostView; send: Send; onClose: () => void }) {
  const [deciding, setDeciding] = useState<Role | null>(null);

  return (
    <div className="console-overlay" role="dialog" aria-label="Konsol fasilitator">
      <div className="console-panel">
        <header className="console-head">
          <h2>Konsol fasilitator</h2>
          <button className="btn" onClick={onClose} aria-label="Tutup konsol (K)">Tutup</button>
        </header>
        <p className="muted small">Jangan tampilkan konsol ini di proyektor: isinya bisa memuat kartu tim. Tekan K untuk membuka dan menutup.</p>

        <section className="stack">
          <h3 className="label">Waktu</h3>
          <ClockControls view={view} send={send} />
          {view.practice && <button className="btn primary" onClick={() => send({ t: 'endPractice' })}>Akhiri latihan, mulai Tahun 1</button>}
          <div className="row">
            <span>Tempo:</span>
            <button className={`btn${view.tempo === 'normal' ? ' primary' : ''}`} onClick={() => send({ t: 'tempo', tempo: 'normal' })}>Normal</button>
            <button className={`btn${view.tempo === 'santai' ? ' primary' : ''}`} onClick={() => send({ t: 'tempo', tempo: 'santai' })}>Santai (+50%)</button>
          </div>
          <p className="muted small">Tempo baru berlaku mulai fase berikutnya.</p>
        </section>

        <section className="stack">
          <h3 className="label">Suara dan gerak</h3>
          <AvControls />
        </section>

        {view.console && Object.keys(view.console.decisions).length > 0 && (
          <section className="stack">
            <h3 className="label">Keputusan tim</h3>
            <ul className="console-teams">
              {view.teams.map(team => (
                <li key={team.role}>
                  <RoleName role={team.role} />
                  <span className="muted small">{team.locked ? 'Sah' : team.offline ? 'Tanpa HP' : `${team.proposers}/${team.members} memilih`}</span>
                  {!team.locked && (
                    <button className={`btn${team.offline ? ' primary' : ''}`} onClick={() => setDeciding(deciding === team.role ? null : team.role)}>
                      {deciding === team.role ? 'Batal' : team.offline ? 'Isi keputusan' : 'Ambil alih'}
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {deciding && view.console.decisions[deciding] && !view.teams.find(t => t.role === deciding)!.locked && (
              <HostDecision key={deciding} role={deciding} view={view} send={send} onDone={() => setDeciding(null)} />
            )}
          </section>
        )}

        {view.phase === 'selesai' && (
          <section className="stack">
            <h3 className="label">Survei peserta</h3>
            <SurveyResults view={view} />
          </section>
        )}

        {view.phase === 'selesai' && view.history && <ExportPanel view={view} />}

        {view.phase === 'tebak' && view.console && (
          <section className="stack">
            <h3 className="label">Tebakan tim tanpa HP</h3>
            {view.teams.filter(t => t.offline && !t.finalDone).map(team => (
              <HostFinal key={team.role} role={team.role} view={view} send={send} />
            ))}
            {!view.teams.some(t => t.offline && !t.finalDone) && <p className="muted small">Tidak ada tim tanpa HP yang perlu diisi.</p>}
          </section>
        )}
      </div>
    </div>
  );
}

function HostDecision({ role, view, send, onDone }: { role: Role; view: HostView; send: Send; onDone: () => void }) {
  const ctx = view.console!.decisions[role]!;
  const [draft, setDraft] = useState<Decision>(ctx.majority);
  return (
    <div className="stack host-decision">
      <h3>Keputusan {ROLE_LABEL[role]}</h3>
      <DecisionForm ctx={ctx} value={draft} onChange={setDraft} />
      <button className="btn primary" onClick={() => { send({ t: 'hostDecide', role, decision: draft }); onDone(); }}>Sahkan untuk {ROLE_LABEL[role]}</button>
    </div>
  );
}

function HostFinal({ role, view, send }: { role: Role; view: HostView; send: Send }) {
  const [agendas, setAgendas] = useState<Partial<Record<Role, AgendaId>>>({});
  const [oknum, setOknum] = useState<Role | null>(null);
  const options = view.console!.agendaOptions;
  return (
    <form className="stack host-decision" onSubmit={e => { e.preventDefault(); send({ t: 'hostFinal', role, vote: { agendas, oknum } }); }}>
      <h3>Tebakan {ROLE_LABEL[role]}</h3>
      {ROLES.filter(r => r !== role).map(target => (
        <label key={target} className="field compact">
          <span>Agenda {ROLE_LABEL[target]}</span>
          <select value={agendas[target] ?? ''} onChange={e => setAgendas({ ...agendas, [target]: (e.target.value || undefined) as AgendaId })}>
            <option value="">Tidak menebak</option>
            {options[target].map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </label>
      ))}
      {view.options.oknum && (
        <label className="field compact">
          <span>Menunjuk Oknum</span>
          <select value={oknum ?? ''} onChange={e => setOknum((e.target.value || null) as Role | null)}>
            <option value="">Tidak menunjuk</option>
            {ROLES.filter(r => r !== role).map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </select>
        </label>
      )}
      <button className="btn primary">Kirim tebakan {ROLE_LABEL[role]}</button>
    </form>
  );
}
