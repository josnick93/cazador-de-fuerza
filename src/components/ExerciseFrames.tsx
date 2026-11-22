import { useEffect, useState } from "react";
import { Dumbbell } from "lucide-react";

const FRAME_MS = 1000;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Alterna la foto inicial y final del ejercicio como si fuera un GIF. Con movimiento reducido
 * no se anima solo: se cambia tocando.
 */
export function ExerciseFrames({ images, alt }: { images: string[]; alt: string }) {
  const [frame, setFrame] = useState(0);
  const [auto] = useState(() => !prefersReducedMotion());
  // Por contenido: el array llega nuevo en cada render del padre (el entreno re-renderiza cada segundo).
  const imagesKey = images.join("|");
  const count = images.length;

  useEffect(() => {
    setFrame(0);
  }, [imagesKey]);

  useEffect(() => {
    if (!auto || count < 2) return;
    const id = window.setInterval(() => setFrame((f) => (f + 1) % count), FRAME_MS);
    return () => window.clearInterval(id);
  }, [auto, count, imagesKey]);

  if (images.length === 0) {
    return (
      <div className="grid aspect-[4/3] w-full place-items-center rounded-2xl border border-border bg-surface text-muted-foreground">
        <div className="flex flex-col items-center gap-2 text-xs">
          <Dumbbell className="h-8 w-8" />
          Sin fotos para este ejercicio
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setFrame((f) => (f + 1) % images.length)}
      aria-label={`Ver ${frame === 0 ? "posición final" : "posición inicial"}`}
      className="relative block aspect-[4/3] w-full overflow-hidden rounded-2xl border border-border bg-black"
    >
      {images.map((src, i) => (
        <img
          key={src}
          src={src}
          alt={i === 0 ? `${alt}: posición inicial` : `${alt}: posición final`}
          className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-300 ${
            i === frame ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}
      <span className="absolute bottom-2 left-2 rounded-md bg-background/80 px-2 py-0.5 font-display text-[11px] font-bold text-foreground">
        {frame === 0 ? "INICIO" : "FINAL"}
      </span>
    </button>
  );
}
