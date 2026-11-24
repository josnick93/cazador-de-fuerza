import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ChevronDown,
  Flame,
  LogIn,
  RefreshCw,
  Share2,
  Trophy,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import { useApp } from "@/components/AppContext";
import type { FeedItem, FriendSummary, FriendsResponse } from "@/lib/friendsApi";
import {
  addFriend,
  clearPendingInvite,
  fetchFriends,
  getPendingInvite,
  regenerateCode,
  removeFriend,
  shareInvite,
} from "@/services/friendsService";
import { formatWeight, relativeDay } from "@/services/strengthService";

const MEDALS = ["text-gold", "text-secondary-foreground", "text-orange-400"];

function weekLine(a: FriendSummary): string {
  const w = a.weekWorkouts === 1 ? "1 entreno" : `${a.weekWorkouts} entrenos`;
  return a.weekPrs > 0 ? `${w} · ${a.weekPrs} PR` : w;
}

function AthleteRow({
  athlete,
  position,
  isMe,
  open,
  onToggle,
  onRemove,
}: {
  athlete: FriendSummary;
  position: number;
  isMe: boolean;
  open: boolean;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const { profile } = useApp();
  const [confirm, setConfirm] = useState(false);
  return (
    <li
      className={`rounded-2xl border ${isMe ? "border-primary/50 bg-primary/10" : "border-border bg-card"}`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex min-h-[64px] w-full items-center gap-3 px-3 py-2.5 text-left"
      >
        <span
          className={`w-6 shrink-0 text-center font-display text-lg font-bold ${MEDALS[position - 1] ?? "text-muted-foreground"}`}
        >
          {position}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base font-bold text-foreground">
            {athlete.name}
            {isMe && <span className="ml-1.5 text-xs font-semibold text-primary">(tú)</span>}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {athlete.rank} · Nv. {athlete.level} · {weekLine(athlete)}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="tabular-nums-display font-display text-lg font-bold text-primary">
            {athlete.weekXp}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">XP semana</p>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="space-y-3 border-t border-border/60 px-3 pb-3 pt-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-surface p-2">
              <p className="flex items-center justify-center gap-1 font-display text-lg font-bold text-orange-400">
                <Flame className="h-4 w-4" />
                {athlete.streakWeeks}
              </p>
              <p className="text-[10px] uppercase text-muted-foreground">Semanas seguidas</p>
            </div>
            <div className="rounded-xl bg-surface p-2">
              <p className="font-display text-lg font-bold text-foreground">
                {athlete.total ? formatWeight(athlete.total, profile.unit) : "—"}
              </p>
              <p className="text-[10px] uppercase text-muted-foreground">Total SBD</p>
            </div>
            <div className="rounded-xl bg-surface p-2">
              <p className="font-display text-sm font-bold leading-7 text-foreground">
                {athlete.lastWorkoutAt ? relativeDay(athlete.lastWorkoutAt) : "—"}
              </p>
              <p className="text-[10px] uppercase text-muted-foreground">Último entreno</p>
            </div>
          </div>

          {athlete.lifts.length > 0 ? (
            <ul className="grid grid-cols-2 gap-2">
              {athlete.lifts.map((lift) => (
                <li
                  key={lift.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-surface px-3 py-2 text-sm"
                >
                  <span className="text-muted-foreground">{lift.label}</span>
                  <span className="tabular-nums-display font-bold text-foreground">
                    {formatWeight(lift.e1rm, profile.unit)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Aún no tiene marcas en los básicos.</p>
          )}
          <p className="text-[11px] text-muted-foreground">
            Marcas: mejor 1RM estimado de los últimos 6 meses.
          </p>

          {!isMe &&
            (confirm ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setConfirm(false)}
                  className="min-h-[48px] rounded-xl border border-border bg-surface text-sm font-semibold text-foreground"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={onRemove}
                  className="min-h-[48px] rounded-xl bg-destructive text-sm font-bold text-destructive-foreground"
                >
                  Quitar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirm(true)}
                className="flex min-h-[48px] w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-surface text-sm font-semibold text-muted-foreground"
              >
                <UserMinus className="h-4 w-4" />
                Quitar de amigos
              </button>
            ))}
        </div>
      )}
    </li>
  );
}

function FeedRow({ item }: { item: FeedItem }) {
  return (
    <li className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-foreground">
          <span className="font-bold">{item.name}</span> · {item.title}
        </p>
        <span className="shrink-0 text-xs text-muted-foreground">
          {relativeDay(item.completedAt)}
        </span>
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">
        +{item.xp} XP
        {item.prs.length > 0 && (
          <span className="text-gold"> · 🏆 PR en {item.prs.join(", ")}</span>
        )}
      </p>
    </li>
  );
}

export function AmigosPage() {
  const { account, setView } = useApp();
  const signedIn = account.user !== null;
  const [data, setData] = useState<FriendsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = async () => {
    setLoading(true);
    const res = await fetchFriends();
    if (!mounted.current) return;
    setLoading(false);
    if (res.ok) {
      setData(res.data);
      setError(null);
    } else setError(res.error);
  };

  const add = async (code: string, fromInvite = false) => {
    setAdding(true);
    setNotice(null);
    const res = await addFriend(code);
    if (fromInvite) clearPendingInvite();
    if (!mounted.current) return;
    setAdding(false);
    if (res.ok) {
      setDraft("");
      setNotice(`¡${res.data.name} ya está en tu gremio!`);
      setOpenId(res.data.id);
      await load();
    } else {
      setNotice(fromInvite ? `No se pudo aceptar la invitación: ${res.error}` : res.error);
    }
  };

  useEffect(() => {
    if (!signedIn) return;
    const pending = getPendingInvite();
    if (pending) void add(pending, true);
    else void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!adding && draft.trim()) void add(draft);
  };

  const onShare = async () => {
    if (!data) return;
    const r = await shareInvite(data.code);
    if (r === "copied") setNotice("Enlace copiado: pégalo en el grupo de tus amigos.");
    else if (r === "error") setNotice(`Pásales tu código: ${data.code}`);
  };

  const onRegenerate = async () => {
    setConfirmRegen(false);
    const res = await regenerateCode();
    if (!mounted.current) return;
    if (res.ok) {
      setData((d) => (d ? { ...d, code: res.data } : d));
      setNotice("Código nuevo: el anterior ya no sirve.");
    } else setNotice(res.error);
  };

  const onRemove = async (id: string) => {
    const res = await removeFriend(id);
    if (!mounted.current) return;
    if (res.ok) {
      setOpenId(null);
      await load();
    } else setNotice(res.error);
  };

  if (!signedIn) {
    return (
      <div className="px-4 pt-4">
        <section className="system-panel rounded-2xl p-5 text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl border border-primary/40 bg-primary/10 text-primary">
            <Users className="h-7 w-7" />
          </div>
          <h1 className="font-display text-xl font-bold text-foreground">Tu gremio</h1>
          <p className="mt-2 text-sm text-secondary-foreground">
            Pica a tus amigos: clasificación semanal, rachas y marcas solo entre vosotros. Necesitas
            entrar con Google.
          </p>
          {getPendingInvite() && (
            <p className="mt-3 text-sm font-semibold text-primary">
              Tienes una invitación pendiente: entra y se acepta sola.
            </p>
          )}
          <button
            type="button"
            onClick={() => setView("perfil")}
            className="mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-primary/50 bg-primary/15 font-display text-sm font-bold text-primary"
          >
            <LogIn className="h-4 w-4" />
            Entrar para ver a tus amigos
          </button>
        </section>
      </div>
    );
  }

  const ranking = data ? [...data.friends, data.me] : [];
  ranking.sort(
    (a, b) =>
      b.weekXp - a.weekXp ||
      b.weekWorkouts - a.weekWorkouts ||
      b.level - a.level ||
      a.name.localeCompare(b.name),
  );

  return (
    <div className="flex flex-col gap-5 px-4 pb-6 pt-4">
      <section className="system-panel rounded-2xl p-4" aria-labelledby="gremio-title">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/15 px-2.5 py-1 font-display text-xs font-bold tracking-wider text-primary">
          <Users className="h-3.5 w-3.5" />
          GREMIO
        </span>
        <h1 id="gremio-title" className="mt-2 font-display text-xl font-bold text-foreground">
          Invita a tus amigos
        </h1>
        <p className="mt-1 text-sm text-secondary-foreground">
          Solo veréis rango, XP, entrenos y marcas. Nada de peso corporal ni nutrición.
        </p>

        <div className="mt-3 flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Tu código</p>
            <p className="font-display text-2xl font-bold tracking-[0.3em] text-foreground">
              {data?.code ?? "······"}
            </p>
          </div>
          {confirmRegen ? (
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setConfirmRegen(false)}
                className="min-h-[48px] rounded-xl px-2 text-xs font-semibold text-muted-foreground"
              >
                No
              </button>
              <button
                type="button"
                onClick={() => void onRegenerate()}
                className="min-h-[48px] rounded-xl border border-border px-3 text-xs font-bold text-foreground"
              >
                Cambiar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmRegen(true)}
              disabled={!data}
              aria-label="Generar un código nuevo"
              className="grid h-12 w-12 place-items-center rounded-xl text-muted-foreground disabled:opacity-40"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => void onShare()}
          disabled={!data}
          className="mt-3 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-primary font-display text-sm font-bold text-primary-foreground disabled:opacity-60"
        >
          <Share2 className="h-4 w-4" />
          Compartir invitación
        </button>

        <form onSubmit={onSubmit} className="mt-3 flex gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value.toUpperCase())}
            maxLength={8}
            autoCapitalize="characters"
            autoComplete="off"
            placeholder="Código de un amigo"
            aria-label="Código de un amigo"
            className="min-h-[48px] min-w-0 flex-1 rounded-xl border border-input bg-surface px-3.5 font-display text-sm tracking-widest text-foreground placeholder:tracking-normal placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
          <button
            type="submit"
            disabled={adding || !draft.trim()}
            className="flex min-h-[48px] shrink-0 items-center gap-1.5 rounded-xl border border-primary/50 bg-primary/15 px-4 font-display text-sm font-bold text-primary disabled:opacity-50"
          >
            <UserPlus className="h-4 w-4" />
            Añadir
          </button>
        </form>
        {notice && (
          <p role="status" className="mt-2 text-sm text-primary">
            {notice}
          </p>
        )}
      </section>

      <section aria-labelledby="ranking-title" className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2
            id="ranking-title"
            className="flex items-center gap-2 font-display text-base font-bold uppercase tracking-wider text-foreground"
          >
            <Trophy className="h-4 w-4 text-gold" />
            Clasificación semanal
          </h2>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            aria-label="Actualizar"
            className="grid h-12 w-12 place-items-center rounded-xl text-muted-foreground disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {!data && loading && <p className="text-sm text-muted-foreground">Cargando el gremio…</p>}

        {data && (
          <>
            <ol className="space-y-2">
              {ranking.map((a, i) => (
                <AthleteRow
                  key={a.id}
                  athlete={a}
                  position={i + 1}
                  isMe={a.id === data.me.id}
                  open={openId === a.id}
                  onToggle={() => setOpenId((id) => (id === a.id ? null : a.id))}
                  onRemove={() => void onRemove(a.id)}
                />
              ))}
            </ol>
            {data.friends.length === 0 && (
              <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                Aún estás solo en el gremio. Comparte tu invitación y a ver quién suma más XP esta
                semana.
              </p>
            )}
            <p className="text-[11px] text-muted-foreground">
              La semana va de lunes a domingo. Cuenta la XP de los entrenos sincronizados.
            </p>
          </>
        )}
      </section>

      {data && data.feed.length > 0 && (
        <section aria-labelledby="feed-title" className="space-y-2.5">
          <h2
            id="feed-title"
            className="font-display text-base font-bold uppercase tracking-wider text-foreground"
          >
            Actividad
          </h2>
          <ul className="space-y-2">
            {data.feed.map((item) => (
              <FeedRow key={`${item.userId}-${item.completedAt}`} item={item} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
