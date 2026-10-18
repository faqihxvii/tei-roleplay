import { ROLE_LABEL } from '../../engine/src/content/roles';
import type { Decision, Konsumsi, Lever, Role, Step, Upah } from '../../engine/src/types';
import type { CardView, DecisionContext } from '../../room/src/views';

// One form for a team's yearly decision: a policy card plus the role's lever and power.
// Used by every member's phone (as a proposal) and by the facilitator console (for offline teams).

type Tally = DecisionContext['tally'];

const votes = (tally: Tally | undefined, field: string, value: unknown) =>
  tally?.[field]?.find(v => JSON.stringify(v.value) === JSON.stringify(value))?.count ?? 0;

function VoteBadge({ count }: { count: number }) {
  if (!count) return null;
  return <span className="votes" aria-label={`${count} suara`}>{count}</span>;
}

function Choice<T>({ legend, field, value, options, onChange, disabled, tally, frozen }: {
  legend: string;
  field: string;
  value: T;
  options: { value: T; label: string; disabled?: boolean; hint?: string }[];
  onChange: (value: T) => void;
  disabled: boolean;
  tally?: Tally;
  frozen?: boolean;
}) {
  return (
    <fieldset className="choice" disabled={disabled || frozen}>
      <legend>{legend}{frozen && <span className="frozen"> · dibekukan krisis tahun ini</span>}</legend>
      <div className="segmented">
        {options.map(option => (
          <label key={String(option.value)} className={`seg${JSON.stringify(option.value) === JSON.stringify(value) ? ' on' : ''}${option.disabled ? ' off' : ''}`} title={option.hint}>
            <input
              type="radio"
              name={field}
              checked={JSON.stringify(option.value) === JSON.stringify(value)}
              disabled={option.disabled}
              onChange={() => onChange(option.value)}
            />
            <span>{option.label}</span>
            <VoteBadge count={votes(tally, field, option.value)} />
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function CardOption({ card, checked, onChange, disabled, count }: { card: CardView | null; checked: boolean; onChange: () => void; disabled: boolean; count: number }) {
  const unplayable = !!card && !card.playable;
  return (
    <label className={`policy${checked ? ' on' : ''}${unplayable ? ' off' : ''}`}>
      <input type="radio" name="cardId" checked={checked} onChange={onChange} disabled={disabled || unplayable} />
      <span className="policy-body">
        <span className="policy-name">{card ? card.name : 'Tidak memainkan kartu'}<VoteBadge count={count} /></span>
        {card && <span className="policy-desc">{card.description}</span>}
        {card && (
          <span className="effects">
            {card.effects.map(e => <span key={e.stat} className={`effect ${e.good ? 'up' : 'down'}`}>{e.label} {e.arrows}</span>)}
          </span>
        )}
        {card && card.delayed.length > 0 && (
          <span className="effects later">
            <span className="font-semibold">Tahun depan:</span>
            {card.delayed.map(e => <span key={e.stat} className={`effect ${e.good ? 'up' : 'down'}`}>{e.label} {e.arrows}</span>)}
          </span>
        )}
        {card?.note && <span className="policy-note">{card.note}</span>}
        {unplayable && <span className="policy-note warn">{card!.requires ?? 'Belum bisa dimainkan'}</span>}
      </span>
    </label>
  );
}

export function DecisionForm({ ctx, value, onChange, disabled = false, showVotes = true }: {
  ctx: DecisionContext;
  value: Decision;
  onChange: (decision: Decision) => void;
  disabled?: boolean;
  showVotes?: boolean;
}) {
  const tally = showVotes ? ctx.tally : undefined;
  const frozen = (lever: Lever) => ctx.frozen.includes(lever);
  const set = (patch: Partial<Decision>) => onChange({ ...value, ...patch } as Decision);

  return (
    <div className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-2" disabled={disabled}>
        <legend>Kartu kebijakan</legend>
        {ctx.hand.map(card => (
          <CardOption key={card.id} card={card} checked={value.cardId === card.id} onChange={() => set({ cardId: card.id })} disabled={disabled} count={votes(tally, 'cardId', card.id)} />
        ))}
        <CardOption card={null} checked={value.cardId === null} onChange={() => set({ cardId: null })} disabled={disabled} count={votes(tally, 'cardId', null)} />
      </fieldset>

      {value.role === 'pemerintah' && (
        <Choice<Step> legend="Pajak" field="pajak" value={value.pajak} tally={tally} disabled={disabled} frozen={frozen('pajak')}
          options={[{ value: -1, label: 'Turun' }, { value: 0, label: 'Tetap' }, { value: 1, label: 'Naik' }]}
          onChange={pajak => set({ pajak })} />
      )}

      {value.role === 'bankSentral' && (
        <>
          <Choice<Step> legend={`Suku bunga (sekarang level ${ctx.bunga} dari 5)`} field="bunga" value={value.bunga} tally={tally} disabled={disabled} frozen={frozen('bunga')}
            options={[{ value: -1, label: 'Turun', disabled: ctx.bunga <= 1 }, { value: 0, label: 'Tahan' }, { value: 1, label: 'Naik', disabled: ctx.bunga >= 5 }]}
            onChange={bunga => set({ bunga })} />
          <Choice legend="Kekuatan: Independen" field="tolakCetakUang" value={value.tolakCetakUang} tally={tally} disabled={disabled}
            options={[{ value: false, label: 'Ikuti Pemerintah' }, { value: true, label: 'Tolak Cetak Uang' }]}
            onChange={tolakCetakUang => set({ tolakCetakUang })} />
        </>
      )}

      {value.role === 'pengusaha' && (
        <Choice legend="Harga" field="hargaNaik" value={value.hargaNaik} tally={tally} disabled={disabled} frozen={frozen('harga')}
          options={[{ value: false, label: 'Tahan' }, { value: true, label: 'Naik' }]}
          onChange={hargaNaik => set({ hargaNaik })} />
      )}

      {value.role === 'buruh' && (
        <>
          <Choice<Upah> legend="Tuntutan upah" field="upah" value={value.upah} tally={tally} disabled={disabled} frozen={frozen('upah')}
            options={[{ value: 0, label: 'Tidak ada' }, { value: 1, label: 'Moderat' }, { value: 2, label: 'Tinggi' }]}
            onChange={upah => set({ upah })} />
          <Choice legend="Kekuatan: Mogok" field="mogok" value={value.mogok} tally={tally} disabled={disabled}
            options={[{ value: false, label: 'Tidak mogok' }, { value: true, label: 'Mogok', disabled: !ctx.canMogok, hint: ctx.canMogok ? undefined : 'Butuh Solidaritas ≥ 2' }]}
            onChange={mogok => set({ mogok })} />
          {!ctx.canMogok && <p className="text-muted text-xs">Mogok butuh Solidaritas minimal 2.</p>}
        </>
      )}

      {value.role === 'masyarakat' && (
        <>
          <Choice<Konsumsi> legend="Konsumsi" field="konsumsi" value={value.konsumsi} tally={tally} disabled={disabled} frozen={frozen('konsumsi')}
            options={[{ value: 'hemat', label: 'Hemat' }, { value: 'biasa', label: 'Biasa' }, { value: 'belanja', label: 'Belanja', disabled: !ctx.canBelanja, hint: ctx.canBelanja ? undefined : 'Butuh Tabungan ≥ 1' }]}
            onChange={konsumsi => set({ konsumsi })} />
          <label className="field compact">
            <span>Kekuatan: Suara Publik <small className="text-muted">(efek Kepercayaan kartu tim itu jadi dua kali lipat)</small></span>
            <select value={value.viral ?? ''} disabled={disabled} onChange={e => set({ viral: (e.target.value || null) as Role | null })}>
              <option value="">Tidak memviralkan siapa pun</option>
              {ctx.viralTargets.map(role => <option key={role} value={role}>Viralkan {ROLE_LABEL[role]}{votes(tally, 'viral', role) ? ` (${votes(tally, 'viral', role)} suara)` : ''}</option>)}
            </select>
          </label>
        </>
      )}
    </div>
  );
}
