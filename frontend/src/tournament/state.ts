export interface TournamentParticipant {
  id: number;
  alias: string;
  isBot: boolean;
  userId: number | null;
}

export interface TournamentMatchSlot {
  id: number | null;
  alias: string;
  isBot: boolean;
}

export interface TournamentMatchView {
  id: number;
  round: number;
  status: "scheduled" | "in_progress" | "finished";
  order: number;
  a: TournamentMatchSlot;
  b: TournamentMatchSlot;
  scoreA: number | null;
  scoreB: number | null;
  winnerAlias: string | null;
}

export type SubmitScoreFn = (matchId: number, scoreA: number, scoreB: number) => Promise<void>;
export type ReloadStateFn = () => Promise<void>;

export interface TournamentState {
  active: boolean;
  currentMatch: number;
  matches: TournamentMatchView[];
  stopCurrentGame: (() => void) | null;
  tournamentId: number;
  pointsToWin: number;
  participants: Record<number, TournamentParticipant>;
  nextMatchId: number | null;
  submitScore: SubmitScoreFn;
  reload: ReloadStateFn;
}

type CreateTournamentStateParams = {
  tournamentId: number;
  pointsToWin: number;
  matches: TournamentMatchView[];
  participants: Record<number, TournamentParticipant>;
  nextMatchId: number | null;
  submitScore: SubmitScoreFn;
  reload: ReloadStateFn;
};

export function createTournamentState({
  tournamentId,
  pointsToWin,
  matches,
  participants,
  nextMatchId,
  submitScore,
  reload,
}: CreateTournamentStateParams): TournamentState {
  const currentMatch =
    nextMatchId !== null ? matches.findIndex((m) => m.id === nextMatchId) : -1;

  return {
    active: currentMatch !== -1,
    currentMatch,
    matches,
    stopCurrentGame: null,
    tournamentId,
    pointsToWin,
    participants,
    nextMatchId,
    submitScore,
    reload,
  };
}

//to keep 3d flag after refresh
const STORAGE_KEY = "pong:is3DActive";

export let is3DActive = (() => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === "true";
  } catch {
    return false;
  }
})();

export function toggle3D() {
  is3DActive = !is3DActive;
  try {
    localStorage.setItem(STORAGE_KEY, String(is3DActive));
  } catch {}
}

export function set3D(value: boolean) {
  is3DActive = value;
  try {
    localStorage.setItem(STORAGE_KEY, String(is3DActive));
  } catch {}
}