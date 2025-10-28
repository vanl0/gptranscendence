import {
  createTournamentState,
  TournamentMatchView,
  TournamentParticipant,
  TournamentState,
} from "../tournament/state";
import { createAliasOverlay } from "../tournament/ui";
import { showMatchList } from "../tournament/controller";
import { getUserIdFromToken, isUserLoggedIn } from "@/userUtils/TokenUtils";
import { getUserDisplayName } from "@/userUtils/DisplayName";

type ParticipantSeed = {
  alias: string;
  isBot: boolean;
  userId: number | null;
};

interface ApiParticipant {
  id: number;
  display_name: string;
  is_bot: boolean;
  user_id: number | null;
}

interface ApiMatch {
  id: number;
  tournament_id: number;
  round: number;
  order_index: number;
  a_participant_id: number | null;
  b_participant_id: number | null;
  status: "scheduled" | "in_progress" | "finished";
  score_a: number | null;
  score_b: number | null;
  winner_participant_id: number | null;
  updated_at: string;
}

const POINTS_TO_WIN = 3;

function authToken(): string | null {
  return localStorage.getItem("auth_token");
}

function buildHeaders(token: string | null, json = false): HeadersInit {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (json) headers["Content-Type"] = "application/json";
  return headers;
}

async function ensureOk(
  res: Response | Promise<Response>,
  fallbackMessage: string
): Promise<Response> {
  const response = await res;
  if (response.ok) return response;
  const text = await response.text();
  const message = text ? `${fallbackMessage}: ${text}` : fallbackMessage;
  throw new Error(message);
}

function toParticipantRecord(api: ApiParticipant): TournamentParticipant {
  return {
    id: api.id,
    alias: api.display_name,
    isBot: api.is_bot,
    userId: api.user_id,
  };
}

function aliasFor(participants: Record<number, TournamentParticipant>, id: number | null): { alias: string; isBot: boolean } {
  if (id === null) return { alias: "TBD", isBot: false };
  const participant = participants[id];
  if (!participant) {
    return { alias: `#${id}`, isBot: false };
  }
  return { alias: participant.alias, isBot: participant.isBot };
}

function toMatchView(
  match: ApiMatch,
  participants: Record<number, TournamentParticipant>
): TournamentMatchView {
  const slotA = aliasFor(participants, match.a_participant_id);
  const slotB = aliasFor(participants, match.b_participant_id);
  const winner = aliasFor(participants, match.winner_participant_id);

  return {
    id: match.id,
    round: match.round,
    order: match.order_index,
    status: match.status,
    a: { id: match.a_participant_id, alias: slotA.alias, isBot: slotA.isBot },
    b: { id: match.b_participant_id, alias: slotB.alias, isBot: slotB.isBot },
    scoreA: match.score_a,
    scoreB: match.score_b,
    winnerAlias: match.winner_participant_id ? winner.alias : null,
  };
}

async function loadMatchesAndNext(
  tournamentId: number,
  token: string | null,
  participants: Record<number, TournamentParticipant>
): Promise<{ matches: TournamentMatchView[]; nextMatchId: number | null }> {
  const [matchesRes, nextRes] = await Promise.all([
    fetch(`/api/tournaments/${tournamentId}/matches`, {
      headers: buildHeaders(token),
    }),
    fetch(`/api/tournaments/${tournamentId}/next`, {
      headers: buildHeaders(token),
    }),
  ]);

  const matchesJson = (await ensureOk(matchesRes, "Failed to load matches").then((r) => r.json())) as ApiMatch[];
  const matches = matchesJson.map((m) => toMatchView(m, participants));

  if (nextRes.status === 204) {
    return { matches, nextMatchId: null };
  }

  const nextMatchJson = await ensureOk(nextRes, "Failed to load next match").then((r) => r.json()) as ApiMatch;
  return { matches, nextMatchId: nextMatchJson.id };
}

async function initializeTournament(seeds: ParticipantSeed[]): Promise<TournamentState> {
  const token = authToken();

  const createRes = await ensureOk(
    fetch("/api/tournaments", {
      method: "POST",
      headers: buildHeaders(token, true),
      body: JSON.stringify({
        mode: "single_elimination",
        points_to_win: POINTS_TO_WIN,
      }),
    }),
    "Failed to create tournament"
  );

  const { id } = (await createRes.json()) as { id: number };

  const shuffled = [...seeds];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  for (const seed of shuffled) {
    await ensureOk(
      fetch(`/api/tournaments/${id}/participants`, {
        method: "POST",
        headers: buildHeaders(token, true),
        body: JSON.stringify({
          display_name: seed.alias,
          is_bot: seed.isBot,
          user_id: seed.userId,
        }),
      }),
      `Failed to add participant ${seed.alias}`
    );
  }

  await ensureOk(
    fetch(`/api/tournaments/${id}/start`, {
      method: "POST",
      headers: buildHeaders(token),
    }),
    "Failed to start tournament"
  );

  const participantsRes = await ensureOk(
    fetch(`/api/tournaments/${id}/participants`, {
      headers: buildHeaders(token),
    }),
    "Failed to fetch participants"
  );

  const participantsJson = (await participantsRes.json()) as ApiParticipant[];
  const participants: Record<number, TournamentParticipant> = {};
  participantsJson.forEach((p) => {
    participants[p.id] = toParticipantRecord(p);
  });

  const { matches, nextMatchId } = await loadMatchesAndNext(id, token, participants);

  let state: TournamentState;

  const submitScore = async (matchId: number, scoreA: number, scoreB: number) => {
    await ensureOk(
      fetch(`/api/tournaments/${id}/matches/${matchId}/score`, {
        method: "POST",
        headers: buildHeaders(token, true),
        body: JSON.stringify({ score_a: scoreA, score_b: scoreB }),
      }),
      "Failed to submit score"
    );
  };

  const reload = async () => {
    const updated = await loadMatchesAndNext(id, token, participants);
    state.matches = updated.matches;
    state.nextMatchId = updated.nextMatchId;
    state.currentMatch =
      updated.nextMatchId !== null
        ? state.matches.findIndex((m) => m.id === updated.nextMatchId)
        : -1;
    state.active = state.currentMatch !== -1;
  };

  state = createTournamentState({
    tournamentId: id,
    pointsToWin: POINTS_TO_WIN,
    matches,
    participants,
    nextMatchId,
    submitScore,
    reload,
  });

  return state;
}

function createContainer(): HTMLDivElement {
  const container = document.createElement("div");
  container.className =
    "flex flex-col justify-between items-center h-screen pt-[5vh] pb-[10vh] min-h-[400px] min-w-[600px] relative mx-auto my-auto";

  container.innerHTML = `
    <h1 class="font-honk text-[10vh] animate-wobble">Tournament</h1>
    <div class="flex items-center justify-center gap-[5vw]">
        <button id="btn-2p" class="w-[20vw] h-[20vw] border-2 border-gray-100 text-gray-100 font-bit text-[5vh] rounded-lg min-w-[300px] min-h-[300px]
            transition-colors duration-300 hover:bg-gray-100 hover:text-cyan-900">
            2 Players
        </button>
        <button id="btn-4p" class="w-[20vw] h-[20vw] border-2 border-gray-100 text-gray-100 font-bit text-[5vh] rounded-lg min-w-[300px] min-h-[300px]
            transition-colors duration-300 hover:bg-gray-100 hover:text-cyan-900">
            4 Players
        </button>
    </div>
    <p id="tournament-error" class="mt-4 font-bit text-[3vh] text-red-400"></p>
    <a href="#/" class="flex items-center justify-center w-[25vw] h-[8vh] rounded-full min-w-[300px] mt-8
        border-2 border-gray-100 text-gray-100 font-bit text-[5vh]
        transition-colors duration-300 hover:bg-gray-100 hover:text-cyan-900">
        Back Home
    </a>
  `;

  return container;
}

async function startTournamentFlow(
  seeds: ParticipantSeed[],
  root: HTMLElement,
  container: HTMLElement,
  options: { overlay?: HTMLElement; message?: HTMLParagraphElement }
) {
  if (options.message) options.message.textContent = "";

  try {
    const state = await initializeTournament(seeds);
    options.overlay?.remove();
    container.remove();
    showMatchList(root, state);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (options.message) options.message.textContent = message;
    throw err;
  }
}

export async function renderTournament(root: HTMLElement) {
  const container = createContainer();

  root.innerHTML = "";
  root.appendChild(container);

  const button2p = container.querySelector<HTMLButtonElement>("#btn-2p")!;
  const button4p = container.querySelector<HTMLButtonElement>("#btn-4p")!;
  const backHomeLink = container.querySelector<HTMLAnchorElement>("a[href='#/']")!;
  const containerMsg = container.querySelector<HTMLParagraphElement>("#tournament-error")!;

  function buildSeedsFromAliases(aliases: string[], userId: number | null): ParticipantSeed[] {
    return aliases.map((alias) => ({
      alias,
      isBot: alias.startsWith("[AI]"),
      userId: alias.startsWith("[AI]") ? null : userId,
    }));
  }

  async function showAliasOverlay(numPlayers: number) {
    const overlay = createAliasOverlay(numPlayers);

    const startButton = document.createElement("button");
    startButton.textContent = "Start Tournament";
    startButton.className =
      "mt-4 w-[25vw] h-[6vh] bg-black font-bit text-lime-500 text-[3vh] rounded-lg transition-colors duration-300 hover:bg-lime-500 hover:text-black min-w-[300px]";
    overlay.appendChild(startButton);

    const backButton = document.createElement("button");
    backButton.textContent = "Back";
    backButton.className =
      "w-[25vw] h-[6vh] bg-black font-bit text-red-600 text-[3vh] rounded-lg transition-colors duration-300 hover:bg-red-600 hover:text-black min-w-[300px]";
    overlay.appendChild(backButton);

    document.body.appendChild(overlay);

    backButton.addEventListener("click", () => {
      overlay.remove();
    });

    startButton.addEventListener("click", async () => {
      let aliases = Array.from(overlay.querySelectorAll<HTMLInputElement>("input")).map((input) => input.value.trim());
      let msg = overlay.querySelector<HTMLParagraphElement>("#tournament-msg");
      if (!msg) {
        msg = document.createElement("p");
        msg.id = "tournament-msg";
        msg.className = "mt-2 pt-2 text-center font-bit text-[3vh] text-red-400 transition-all duration-300";
        overlay.appendChild(msg);
      }

      msg.textContent = "";

      if (aliases.some((name) => name.includes("[") || name.includes("]"))) {
        msg.textContent = "No brackets [] allowed.";
        return;
      }

      if (aliases.some((name) => name.length > 20)) {
        msg.textContent = "Player names cannot exceed 20 characters.";
        return;
      }

      let botCount = 1;
      aliases = aliases.map((name) => {
        if (name === "") {
          return `[AI] ${botCount++}`;
        }
        return name;
      });

      const uniqueAliases = new Set(aliases);
      if (uniqueAliases.size !== aliases.length) {
        msg.textContent = "Player names must be unique.";
        return;
      }

      const seeds = buildSeedsFromAliases(aliases, null);

      startButton.disabled = true;
      startButton.textContent = "Starting...";

      try {
        await startTournamentFlow(seeds, root, container, { overlay, message: msg });
      } catch {
        startButton.disabled = false;
        startButton.textContent = "Start Tournament";
      }
    });
  }

  async function skipAliasOverlay(numPlayers: number) {
    const displayName = await getUserDisplayName();
    const name = displayName || "Guest";
    const token = authToken();
    const userId = token ? getUserIdFromToken(token) : null;

    const seeds: ParticipantSeed[] = [
      { alias: name, isBot: false, userId: userId ?? null },
    ];

    for (let i = 1; i < numPlayers; i++) {
      seeds.push({ alias: `[AI] ${i}`, isBot: true, userId: null });
    }

    button2p.disabled = true;
    button4p.disabled = true;
    containerMsg.textContent = "";

    try {
      await startTournamentFlow(seeds, root, container, { message: containerMsg });
    } catch {
      button2p.disabled = false;
      button4p.disabled = false;
    }
  }

  button2p.addEventListener("click", async () => {
    if (await isUserLoggedIn()) await skipAliasOverlay(2);
    else await showAliasOverlay(2);
  });

  button4p.addEventListener("click", async () => {
    if (await isUserLoggedIn()) await skipAliasOverlay(4);
    else await showAliasOverlay(4);
  });

  backHomeLink.addEventListener("click", () => {
    document.querySelectorAll(".overlay").forEach((el) => el.remove());
  });
}
