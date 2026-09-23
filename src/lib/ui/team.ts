// Team name lives in sessionStorage: survives reloads within a tab, never leaves the browser.
const KEY = "akim.teamName";
export const TEAM_NAME_MAX = 40;

export function normalizeTeamName(raw: string): string {
  return raw.trim().slice(0, TEAM_NAME_MAX);
}

export function getTeamName(): string {
  try {
    return sessionStorage.getItem(KEY) ?? "";
  } catch {
    return ""; // server render, private mode or blocked storage
  }
}

export function setTeamName(name: string): void {
  try {
    sessionStorage.setItem(KEY, normalizeTeamName(name));
  } catch {
    // Storage unavailable: the game still works, the run just gets no stored name.
  }
}
