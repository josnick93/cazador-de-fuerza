export const XP_PER_SESSION = 100;
export const XP_PER_SET = 5;
export const XP_PER_PR = 50;

export interface XpState {
  level: number;
  xp: number;
  nextLevelXp: number;
  hunterRank: string;
}

export function sessionXp(completedSets: number, prCount: number): number {
  if (completedSets <= 0) return 0;
  return XP_PER_SESSION + completedSets * XP_PER_SET + prCount * XP_PER_PR;
}

/** Rangos de cazador por nivel: E → D → C → B → A → S. */
export function rankForLevel(level: number): string {
  if (level >= 30) return "Rango S";
  if (level >= 20) return "Rango A";
  if (level >= 15) return "Rango B";
  if (level >= 10) return "Rango C";
  if (level >= 5) return "Rango D";
  return "Rango E";
}

/** Cada nivel pide un 20% más de XP que el anterior (redondeado a 50). */
export function xpForNextLevel(current: number): number {
  return Math.round((current * 1.2) / 50) * 50;
}

export function addXp(state: XpState, gained: number): XpState & { leveledUp: boolean } {
  let { level, xp, nextLevelXp } = state;
  xp += Math.max(0, gained);
  let leveledUp = false;
  while (xp >= nextLevelXp) {
    xp -= nextLevelXp;
    level += 1;
    nextLevelXp = xpForNextLevel(nextLevelXp);
    leveledUp = true;
  }
  return { level, xp, nextLevelXp, hunterRank: rankForLevel(level), leveledUp };
}
