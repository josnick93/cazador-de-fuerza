import { Dumbbell } from "lucide-react";
import { getExerciseThumbnail } from "@/services/strengthService";

export function ExerciseThumb({
  exerciseId,
  className = "",
}: {
  exerciseId: string;
  className?: string;
}) {
  const src = getExerciseThumbnail(exerciseId);
  return (
    <span
      className={`grid shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-black text-muted-foreground ${className}`}
    >
      {src ? (
        <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <Dumbbell className="h-5 w-5" />
      )}
    </span>
  );
}
