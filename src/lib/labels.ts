import type { Equipment } from "@/types";

export const EQUIPMENT_LABEL: Record<Equipment, string> = {
  gimnasio: "Gimnasio",
  mancuernas: "Mancuernas",
  casa: "Casa",
};

/** 90 → "90 s", 150 → "2,5 min". */
export function formatRest(seconds: number): string {
  return seconds >= 120 ? `${String(seconds / 60).replace(".", ",")} min` : `${seconds} s`;
}
