import { Dialog, Slider, Switch, ToggleGroup } from 'radix-ui';
import { useEffect, useState, type ReactNode } from 'react';
import { ROLE_LABEL } from '../../engine/src/content/roles';
import { ROLES, type AgendaId, type Decision, type Role } from '../../engine/src/types';
import type { ClientMessage } from '../../room/src/protocol';
import type { Tempo } from '../../room/src/room';
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
    <div className="flex flex-wrap gap-2">
      {running && <button className="btn" onClick={() => send({ t: 'pause' })}>Jeda</button>}
      {paused && <button className="btn primary" onClick={() => send({ t: 'resume-clock' })}>Lanjutkan</button>}
      {(running || paused) && <button className="btn" onClick={() => send({ t: 'addTime' })}>+30 detik</button>}
      {(view.phase === 'briefing' || view.phase === 'tahun' || view.phase === 'tebak') && (
        <button className="btn" onClick={() => send({ t: 'next' })}>{running || paused ? 'Lewati fase →' : 'Lanjut →'}</button>
      )}
    </div>
  );
}

function SwitchRow({ checked, onChange, children }: { checked: boolean; onChange: (on: boolean) => void; children: ReactNode }) {
  return (
    <label className="switch-row">
      <Switch.Root className="switch" checked={checked} onCheckedChange={onChange}><Switch.Thumb className="switch-thumb" /></Switch.Root>
      <span>{children}</span>
    </label>
  );
}

/** Master volume and mute (GDD: in the facilitator console), plus the main screen's own motion switch. */
export function AvControls({ compact = false }: { compact?: boolean }) {
  const av = useAvSettings();
  const status = useAudioStatus();
  const note = status.state === 'kosong' ? 'Belum ada file suara terpasang. Permainan tetap utuh tanpa suara.'
    : status.state === 'siap' ? `${status.sfx} efek suara dan ${status.music} musik terpasang${status.temporary ? ' (sintesis sementara, menunggu rekaman sound designer)' : ''}.` : 'Memeriksa file suara…';
  if (compact) return <SwitchRow checked={!av.muted} onChange={on => avSettings.set({ muted: !on })}>Suara di layar utama</SwitchRow>;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-4">
        <button className={`btn${av.muted ? ' primary' : ''}`} onClick={() => avSettings.set({ muted: !av.muted })} aria-pressed={av.muted}>
          {av.muted ? 'Bunyikan' : 'Bisukan'}
        </button>
        <Slider.Root className="slider" min={0} max={100} step={5} value={[Math.round(av.volume * 100)]} disabled={av.muted}
          onValueChange={([v]) => avSettings.set({ volume: (v ?? 0) / 100 })}>
          <Slider.Track className="slider-track"><Slider.Range className="slider-range" /></Slider.Track>
          <Slider.Thumb className="slider-thumb" aria-label="Volume utama" />
        </Slider.Root>
        <span className="num w-8 text-right" aria-hidden="true">{Math.round(av.volume * 100)}</span>
      </div>
      <SwitchRow checked={av.music} onChange={music => avSettings.set({ music })}>Musik</SwitchRow>
      <SwitchRow checked={av.sfx} onChange={sfx => avSettings.set({ sfx })}>Efek suara</SwitchRow>
      <SwitchRow checked={av.reducedMotion} onChange={reducedMotion => avSettings.set({ reducedMotion })}>Kurangi gerak di layar utama</SwitchRow>
      <p className="text-xs text-muted">{note} HP pemain selalu senyap dan hanya bergetar.</p>
    </div>
  );
}

/** The facilitator's drawer: a Radix dialog, so focus stays inside it and Escape closes it. */
export function Console({ view, send, open, onOpenChange }: { view: HostView; send: Send; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [deciding, setDeciding] = useState<Role | null>(null);
  const readyStep = view.phase === 'tahun' && (view.step === 'rapat' || view.step === 'lobi');

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="console-overlay" />
        <Dialog.Content className="console-panel">
          <header className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <Dialog.Title className="text-lg">Konsol fasilitator</Dialog.Title>
              <Dialog.Description className="text-xs text-muted">Jangan tampilkan di proyektor: isinya bisa memuat kartu tim. Tekan K untuk membuka dan menutup.</Dialog.Description>
            </div>
            <Dialog.Close className="btn" aria-label="Tutup konsol (K)">Tutup</Dialog.Close>
          </header>

          <section className="console-section">
            <h3 className="kicker">Waktu</h3>
            <ClockControls view={view} send={send} />
            {view.practice && <button className="btn primary" onClick={() => send({ t: 'endPractice' })}>Akhiri latihan, mulai Tahun 1</button>}
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold">Tempo</span>
              <ToggleGroup.Root type="single" className="flex gap-1.5" aria-label="Tempo" value={view.tempo}
                onValueChange={tempo => { if (tempo) send({ t: 'tempo', tempo: tempo as Tempo }); }}>
                <ToggleGroup.Item className="step-pill" value="normal">Normal</ToggleGroup.Item>
                <ToggleGroup.Item className="step-pill" value="santai">Santai (+50%)</ToggleGroup.Item>
              </ToggleGroup.Root>
            </div>
            <p className="text-xs text-muted">Hanya Rapat Tim, Negosiasi dan Pengesahan yang berwaktu. Tempo baru berlaku mulai fase berikutnya.</p>
          </section>

          {view.console && Object.keys(view.console.decisions).length > 0 && (
            <section className="console-section">
              <h3 className="kicker">Keputusan tim</h3>
              <ul className="console-teams flex flex-col gap-2">
                {view.teams.map(team => (
                  <li key={team.role}>
                    <RoleName role={team.role} />
                    <span className="text-xs text-muted">{team.locked ? 'Sah' : team.offline ? 'Tanpa HP' : `${team.proposers}/${team.members} memilih${readyStep && team.ready ? ' · selesai' : ''}`}</span>
                    {!team.locked && (
                      <div className="actions">
                        {readyStep && !team.offline && (
                          <button className="btn" onClick={() => send({ t: 'hostReady', role: team.role, on: !team.ready })}>
                            {team.ready ? 'Batal selesai' : 'Tandai selesai'}
                          </button>
                        )}
                        <button className={`btn${team.offline ? ' primary' : ''}`} onClick={() => setDeciding(deciding === team.role ? null : team.role)}>
                          {deciding === team.role ? 'Batal' : team.offline ? 'Isi keputusan' : 'Ambil alih'}
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
              {deciding && view.console.decisions[deciding] && !view.teams.find(t => t.role === deciding)!.locked && (
                <HostDecision key={deciding} role={deciding} view={view} send={send} onDone={() => setDeciding(null)} />
              )}
            </section>
          )}

          {view.phase === 'tebak' && view.console && (
            <section className="console-section">
              <h3 className="kicker">Tebakan tim tanpa HP</h3>
              {view.teams.filter(t => t.offline && !t.finalDone).map(team => (
                <HostFinal key={team.role} role={team.role} view={view} send={send} />
              ))}
              {!view.teams.some(t => t.offline && !t.finalDone) && <p className="text-xs text-muted">Tidak ada tim tanpa HP yang perlu diisi.</p>}
            </section>
          )}

          {view.phase === 'selesai' && (
            <section className="console-section">
              <h3 className="kicker">Survei peserta</h3>
              <SurveyResults view={view} />
            </section>
          )}

          {view.phase === 'selesai' && view.history && <section className="console-section"><ExportPanel view={view} /></section>}

          <section className="console-section">
            <h3 className="kicker">Suara dan gerak</h3>
            <AvControls />
          </section>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function HostDecision({ role, view, send, onDone }: { role: Role; view: HostView; send: Send; onDone: () => void }) {
  const ctx = view.console!.decisions[role]!;
  const [draft, setDraft] = useState<Decision>(ctx.majority);
  return (
    <div className="card strong">
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
    <form className="card strong" onSubmit={e => { e.preventDefault(); send({ t: 'hostFinal', role, vote: { agendas, oknum } }); }}>
      <h3>Tebakan {ROLE_LABEL[role]}</h3>
      {ROLES.filter(r => r !== role).map(target => (
        <label key={target} className="field">
          <span>Agenda {ROLE_LABEL[target]}</span>
          <select value={agendas[target] ?? ''} onChange={e => setAgendas({ ...agendas, [target]: (e.target.value || undefined) as AgendaId })}>
            <option value="">Tidak menebak</option>
            {options[target].map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </label>
      ))}
      {view.options.oknum && (
        <label className="field">
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
