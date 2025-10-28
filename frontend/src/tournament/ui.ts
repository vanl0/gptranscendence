import type { TournamentMatchView, TournamentState } from "./state";

// Displays the correct number of boxes for tournament alias input.
export function createAliasOverlay(numPlayers: number): HTMLDivElement {
  const overlay = document.createElement("div");
  overlay.className = "absolute inset-0 bg-black/70 flex flex-col justify-center items-center gap-4";

  for (let i = 1; i <= numPlayers; i++) {
    const input = document.createElement("input");
    input.placeholder = `Player ${i}`;
    input.className = "text-center text-[4vh] font-bit w-[60vw] max-w-[300px]";
    overlay.appendChild(input);
  }

  return overlay;
}

function createCompetitorSpan(alias: string, highlight: boolean): HTMLSpanElement {
  const span = document.createElement("span");
  span.textContent = alias;
  span.className = highlight ? "text-lime-500 font-bold" : "text-gray-300 font-bold";
  return span;
}

function renderMatchRow(match: TournamentMatchView, isNext: boolean, maxRound: number): HTMLDivElement {
  const matchEl = document.createElement("div");
  const winnerAlias = match.winnerAlias;

  if (match.status === "finished") {
    matchEl.className = "flex justify-between items-center p-6 gap-6 border-2 border-gray-600 rounded text-[3vh]";

    const label = document.createElement("span");
    label.className = "text-gray-400 font-bold";
    label.textContent = `Round ${match.round} finished`;

    const detail = document.createElement("span");
    detail.className = "flex items-center gap-4";

    detail.appendChild(createCompetitorSpan(match.a.alias, winnerAlias === match.a.alias));

    const score = document.createElement("span");
    score.className = "font-mono text-[2.5vh] text-gray-400";
    const aScore = match.scoreA ?? 0;
    const bScore = match.scoreB ?? 0;
    score.textContent = `${aScore} - ${bScore}`;
    detail.appendChild(score);

    detail.appendChild(createCompetitorSpan(match.b.alias, winnerAlias === match.b.alias));

    matchEl.append(label, detail);
    return matchEl;
  }

  const label = document.createElement("span");
  label.className = "font-bold";
  const isFinalRound = match.round === maxRound;
  if (isNext && isFinalRound) {
    label.textContent = "Final";
  } else if (isNext) {
    label.textContent = "Next Match";
  } else {
    label.textContent = `Round ${match.round}`;
  }

  if (isNext) {
    matchEl.className = "flex justify-between items-center p-6 gap-6 border-4 border-lime-600 rounded text-[3vh] animate-pulse";
    label.classList.add("text-lime-500");
  } else {
    matchEl.className = "flex justify-between items-center p-6 gap-6 border-2 border-gray-600 rounded text-[3vh]";
    label.classList.add("text-gray-300");
  }

  const detail = document.createElement("span");
  detail.className = "flex items-center gap-4";
  detail.appendChild(createCompetitorSpan(match.a.alias, false));

  const vs = document.createElement("span");
  vs.textContent = "vs";
  vs.className = "text-gray-400";
  detail.appendChild(vs);

  detail.appendChild(createCompetitorSpan(match.b.alias, false));

  matchEl.append(label, detail);
  return matchEl;
}

// Creates, fills and returns the match list container.
export function createMatchList(state: TournamentState): HTMLDivElement {
  const matchListContainer = document.createElement("div");
  matchListContainer.className =
    "flex flex-col justify-between font-bit text-gray-100 items-center h-screen pt-[5vh] pb-[10vh] min-h-[400px] min-w-[600px] relative mx-auto my-auto gap-4";

  matchListContainer.innerHTML = `
    <h2 class="text-[10vh] font-honk animate-wobble">Match List</h2>
    <div class="flex flex-row justify-center items-center gap-20">
      <div id="match-list" class="flex flex-col gap-2 w-full max-w-[60vw] min-w-[300px] text-[3vh]"></div>
      <button id="play" class="self-center w-[400px] h-[100px] border-4 border-lime-600 shadow-2xl
          text-lime-500 font-bit text-[4vh] rounded-full
          transition-colors duration-300 hover:shadow-lg hover:border-lime-500 hover:animate-none">
        Play
      </button>
    </div>
    <a href="#/" class="flex items-center justify-center w-[25vw] h-[6vh] border-2 border-gray-100 text-gray-100 text-[3vh] rounded-lg min-w-[300px]
        transition-colors duration-300 hover:bg-gray-100 hover:text-cyan-900">
      Back Home
    </a>
  `;

  const matchListDiv = matchListContainer.querySelector<HTMLDivElement>("#match-list")!;
  const playBtn = matchListContainer.querySelector<HTMLButtonElement>("#play")!;

  const nextMatchId = state.nextMatchId;
  const sortedMatches = [...state.matches].sort((a, b) =>
    a.round === b.round ? a.order - b.order : a.round - b.round
  );

  const maxRound = sortedMatches.reduce((acc, match) => Math.max(acc, match.round), 1);

  sortedMatches.forEach((match: TournamentMatchView) => {
    const isNext = nextMatchId !== null && match.id === nextMatchId;
    const matchEl = renderMatchRow(match, isNext, maxRound);
    if (isNext) {
      matchListDiv.prepend(matchEl);
    } else {
      matchListDiv.appendChild(matchEl);
    }
  });

  if (!state.active || nextMatchId === null) {
    playBtn.disabled = true;
    playBtn.classList.add("opacity-50", "cursor-not-allowed", "animate-none");
    playBtn.textContent = "Tournament Finished";
  }

  return matchListContainer;
}
