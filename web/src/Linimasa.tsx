import type { FrontPage, Post } from '../../room/src/koran';
import type { PublicStats } from '../../room/src/views';
import { CrisisPhoto, Portrait } from './art';
import { DUR, EASE, m } from './motion';
import { TimelineChart } from './TimelineChart';

// Linimasa TEI: the year told as posts on "Kicau", a made-up platform. The media account carries
// the headline and the crisis photo; a parody official spins it, a buzzer cheers, citizens reply,
// the data account posts the numbers, and a promoted post sells something absurd.

/** Older snapshots have no feed: rebuild a minimal one from the front page. */
function postsOf(page: FrontPage): Post[] {
  if (page.posts?.length) return page.posts;
  const media = { handle: 'HarianTEI', name: 'Harian TEI', role: null, kind: 'media' as const };
  return [
    { id: 'berita', account: media, text: `${page.headline}. ${page.subheadline}`, photo: true, likes: 0, reposts: 0 },
    ...page.voices.map((v, i) => ({ id: `warga${i}`, account: { handle: `warga${i}`, name: v.who, role: null, kind: 'gosip' as const }, text: v.text, replyTo: 'berita', likes: 0, reposts: 0 })),
  ];
}

const count = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace('.0', '')}rb` : String(n));

function Avatar({ post }: { post: Post }) {
  const { role, name, kind } = post.account;
  if (role) return <Portrait role={role} className="post-avatar" fallback={<span className="post-avatar initial">{name[0]}</span>} />;
  return <span className={`post-avatar initial ${kind}`} aria-hidden="true">{kind === 'media' ? 'TEI' : name[0]}</span>;
}

export function PostCard({ post, page, index = 0, onLike }: { post: Post; page: FrontPage; index?: number; onLike?: () => void }) {
  const official = post.account.kind === 'pejabat' || post.account.kind === 'media';
  return (
    <m.article
      className={`post${post.replyTo ? ' reply' : ''}${post.promoted ? ' promoted' : ''} ${post.account.kind}`}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 + index * 0.35, duration: DUR.base, ease: EASE.paper }}
    >
      <Avatar post={post} />
      <div className="post-body">
        <p className="post-head">
          <strong>{post.account.name}</strong>
          {official && <span className="post-check" aria-label="akun terverifikasi">✓</span>}
          <span className="post-handle">@{post.account.handle}</span>
          {post.promoted && <span className="post-promo">Promosi</span>}
        </p>
        {post.replyTo && <p className="post-replying">Membalas</p>}
        <p className={`post-text${post.photo ? ' lead' : ''}`}>{post.text}</p>
        {post.photo && page.crisisId && <CrisisPhoto id={page.crisisId} year={page.year} />}
        {!post.promoted && (
          <p className="post-stats">
            <span aria-label={`${post.reposts} kicau ulang`}>⟲ {count(post.reposts)}</span>
            {onLike
              ? <button type="button" className="post-like" onClick={onLike} aria-label={`Suka, ${post.likes} suka`}>♥ {count(post.likes)}</button>
              : <span aria-label={`${post.likes} suka`}>♥ {count(post.likes)}</span>}
          </p>
        )}
      </div>
    </m.article>
  );
}

/** The projector: the feed in two columns, trending and the growth chart beside it. */
export function LinimasaStage({ page, growth }: { page: FrontPage; growth: { year: number; stats: PublicStats }[] | null }) {
  const posts = postsOf(page);
  const lead = posts[0]!;
  // Two citizen replies fit a projector beside the rest; phones scroll through all of them.
  const replies = posts.filter(p => p.replyTo === lead.id).slice(0, 2);
  const rest = posts.filter(p => p !== lead && p.replyTo !== lead.id);
  return (
    <section className="linimasa" aria-label={`Linimasa TEI tahun ${page.year}`}>
      <header className="linimasa-head">
        <span className="kicau-logo" aria-hidden="true">kicau</span>
        <h1>Linimasa tahun {page.year}</h1>
      </header>
      <div className="linimasa-grid">
        <div className="feed">
          <PostCard post={lead} page={page} />
          {replies.map((p, i) => <PostCard key={p.id} post={p} page={page} index={i + 1} />)}
        </div>
        <div className="feed">
          {rest.map((p, i) => <PostCard key={p.id} post={p} page={page} index={i + replies.length + 1} />)}
        </div>
        <aside className="linimasa-side">
          {!!page.trending?.length && (
            <section className="trending" aria-label="Sedang tren">
              <h2 className="kicker">Sedang tren</h2>
              <ol>
                {page.trending.map((tag, i) => (
                  <m.li key={tag} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1 + i * 0.25, duration: DUR.base }}>
                    <span className="trend-rank">{i + 1}</span>#{tag}
                  </m.li>
                ))}
              </ol>
            </section>
          )}
          {growth && growth.length > 1 && (
            <section className="growth" aria-label="Pertumbuhan indikator">
              <h2 className="kicker">Perjalanan negara</h2>
              <TimelineChart timeline={growth} focus={null} />
            </section>
          )}
        </aside>
      </div>
    </section>
  );
}

/** The phone: the same feed, one column, with a like button that cheers on the projector. */
export function LinimasaFeed({ page, onLike }: { page: FrontPage; onLike?: () => void }) {
  const posts = postsOf(page);
  return (
    <section className="linimasa phone-feed" aria-label={`Linimasa TEI tahun ${page.year}`}>
      <header className="linimasa-head">
        <span className="kicau-logo" aria-hidden="true">kicau</span>
        <h2>Linimasa tahun {page.year}</h2>
      </header>
      {posts.map((p, i) => <PostCard key={p.id} post={p} page={page} index={i} onLike={onLike} />)}
      {!!page.trending?.length && <p className="text-xs text-muted">Sedang tren: {page.trending.map(t => `#${t}`).join(' · ')}</p>}
    </section>
  );
}
