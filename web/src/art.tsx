import { useEffect, useState } from 'react';
import { ROLE_LABEL } from '../../engine/src/content/roles';
import type { Role } from '../../engine/src/types';

// Illustration slots (GDD, "Daftar aset vertical slice"). The illustrator delivers files plus
// public/art/manifest.json; until a file is listed its slot renders nothing and the typographic
// layout stands on its own. No stock or generated images (GDD, "Dilarang").
//   { "crisis":  { "c_beras": "crisis/c_beras.webp" },
//     "peran":   { "buruh": { "tenang": "peran/buruh-tenang.webp", "marah": "peran/buruh-marah.webp" } },
//     "diorama": "diorama/kota.riv" }

export type Expression = 'tenang' | 'senang' | 'panik' | 'marah';

export interface ArtManifest {
  crisis: Record<string, string>;
  peran: Partial<Record<Role, Partial<Record<Expression, string>>>>;
  diorama: string | null;
}

const EMPTY: ArtManifest = { crisis: {}, peran: {}, diorama: null };
let loading: Promise<ArtManifest> | null = null;

function loadArt(): Promise<ArtManifest> {
  loading ??= fetch('/art/manifest.json', { cache: 'no-cache' })
    .then(res => (res.ok ? (res.json() as Promise<Partial<ArtManifest>>) : {}))
    .then(m => ({ ...EMPTY, ...m }))
    .catch(() => EMPTY);
  return loading;
}

export function useArt(): ArtManifest {
  const [art, setArt] = useState<ArtManifest>(EMPTY);
  useEffect(() => {
    let live = true;
    void loadArt().then(m => { if (live) setArt(m); });
    return () => { live = false; };
  }, []);
  return art;
}

/** The caricature beside a role, in the mood the game puts them in. Falls back to calm, then to nothing. */
export function Portrait({ role, expression = 'tenang', className = '' }: { role: Role; expression?: Expression; className?: string }) {
  const art = useArt();
  const set = art.peran[role];
  const file = set?.[expression] ?? set?.tenang;
  if (!file) return null;
  return <img className={`portrait ${className}`} src={`/art/${file}`} alt={`Karikatur ${ROLE_LABEL[role]}, ${expression}`} width={160} height={160} loading="lazy" decoding="async" />;
}

/** The crisis card's illustration; decorative, because the title and narrative carry the meaning. */
export function CrisisArt({ id }: { id: string }) {
  const art = useArt();
  const file = art.crisis[id];
  if (!file) return null;
  return <img className="crisis-art" src={`/art/${file}`} alt="" width={480} height={320} decoding="async" />;
}

/**
 * How each team looks on the results screen: panicked when the country collapsed, pleased with the
 * top score, angry when its agenda failed, calm otherwise.
 */
export function endExpression(team: { score: number; achieved: boolean }, collapsed: boolean, topScore: number): Expression {
  if (collapsed) return 'panik';
  if (team.score === topScore) return 'senang';
  if (!team.achieved) return 'marah';
  return 'tenang';
}
