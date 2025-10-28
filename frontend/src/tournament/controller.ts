import {
  postFinalToChain,
  type BlockchainConfig,
} from "@/blockchain/postFinal";
import { renderGame } from "../views/Game";
import { TournamentState } from "./state";
import { createMatchList } from "./ui";
import type { GameOverState } from "@/pong/types";

export async function playNextMatch(root: HTMLElement, state: TournamentState) {
  if (!state.active || state.currentMatch < 0) return;

  const match = state.matches[state.currentMatch];
  const p1 = match.a.alias;
  const p2 = match.b.alias;
  const aiP1 = match.a.isBot || p1.startsWith("[AI]");
  const aiP2 = match.b.isBot || p2.startsWith("[AI]");
  root.innerHTML = "";

  state.stopCurrentGame = await renderGame(root, {
    tournament: true,
    tournamentState: state,
    player1: p1,
    player2: p2,
    aiPlayer1: aiP1,
    aiPlayer2: aiP2,

    onGameOver: async (result: GameOverState) => {
      if (!state.active) return;

      const resolvedWinner = result.winner === 1 ? p1 : p2;

      const gameContainer = root.querySelector<HTMLDivElement>("#game-container");
      if (!gameContainer) return;

      const overlay = document.createElement("div");
      overlay.className = "absolute inset-0 flex flex-col justify-center items-center gap-6 overlay";
      gameContainer.appendChild(overlay);

      const statusMsg = document.createElement("p");
      statusMsg.className = "font-bit text-[2.5vh] text-red-400";
      overlay.appendChild(statusMsg);

      const nextBtn = document.createElement("button");
      nextBtn.textContent = "Proceed";
      nextBtn.className =
        "mt-[35vh] w-[25vw] h-[6vh] bg-black font-bit text-[3vh] text-lime-500 rounded-lg transition-colors duration-300 hover:bg-lime-500 hover:text-black";
      overlay.appendChild(nextBtn);

      let submitting = false;

      nextBtn.addEventListener("click", async () => {
        if (submitting) return;
        submitting = true;
        statusMsg.textContent = "";
        nextBtn.disabled = true;
        nextBtn.textContent = "Submitting...";

        try {
          await state.submitScore(match.id, result.score1, result.score2);
          await state.reload();
        } catch (err) {
          submitting = false;
          nextBtn.disabled = false;
          nextBtn.textContent = "Retry";
          const message = err instanceof Error ? err.message : "Failed to report match.";
          statusMsg.textContent = message;
          return;
        }

        document.querySelectorAll(".overlay").forEach((el) => el.remove());
        state.stopCurrentGame?.();

        if (!state.active) {
          const finalOverlay = document.createElement("div");
          finalOverlay.className =
            "absolute inset-0 flex flex-col justify-center items-center gap-6 overlay bg-black/80 text-white font-bit text-center";

          const title = document.createElement("h2");
          title.textContent = "Tournament Finished";
          title.className = "text-[10vh] text-stone-600 mb-4";
          finalOverlay.appendChild(title);

          const msg = document.createElement("p");
          msg.textContent = `${resolvedWinner} won!`;
          msg.className = "text-[8vh] mb-6 text-lime-400 animate-bounce drop-shadow-[0_0_10px_gold]";
          finalOverlay.appendChild(msg);

          if (!(aiP1 && aiP2)) {
            const pointsToWin = state.pointsToWin;
            const winnerAlias = resolvedWinner;

            postFinalToChain({
              tournament_id: state.tournamentId,
              winner_alias: winnerAlias,
              score_a: result.score1,
              score_b: result.score2,
              points_to_win: pointsToWin,
            })
              .then((res) => {
                const txHash = typeof res?.txHash === "string" ? res.txHash.trim() : "";
                const config = res?.blockchainConfig ?? null;

                const explorerUrl = buildExplorerUrl(txHash, config);

                if (explorerUrl) {
                  const bcBtn = document.createElement("a");
                  bcBtn.href = explorerUrl;
                  bcBtn.target = "_blank";
                  bcBtn.rel = "noopener noreferrer";
                  bcBtn.textContent = "View Blockchain Transaction";
                  bcBtn.className =
                    "mt-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-500 transition-colors duration-200";
                  finalOverlay.appendChild(bcBtn);
                } else if (txHash) {
                  const bcMsg = document.createElement("p");
                  bcMsg.className = "mt-2 text-[2vh] text-cyan-300 text-center max-w-[32rem]";

                  if (isMockHash(txHash) || (config?.mode ?? "").toLowerCase() !== "real") {
                    bcMsg.textContent = "Blockchain recorded in mock mode (no public explorer link).";
                  } else if (config?.network) {
                    bcMsg.textContent = `Transaction recorded on ${config.network}, but no explorer link is available for this network.`;
                  } else {
                    bcMsg.textContent = "Transaction recorded on-chain, but no explorer link is available.";
                  }

                  finalOverlay.appendChild(bcMsg);
                }
              })
              .catch((err) => console.error("Failed to record final on blockchain:", err));
          }

          const homeBtn = document.createElement("button");
          homeBtn.textContent = "Back to Home";
          homeBtn.className =
            "w-[25vw] h-[6vh] bg-black font-bit text-[3vh] text-lime-500 rounded-lg transition-colors duration-300 hover:bg-lime-500 hover:text-black min-w-[300px]";
          homeBtn.addEventListener("click", () => {
            location.hash = "/";
          });
          finalOverlay.appendChild(homeBtn);

          gameContainer.appendChild(finalOverlay);
          return;
        }

        showMatchList(root, state);
      });
    },
  });
}

function buildExplorerUrl(txHash: string, config: BlockchainConfig | null): string | null {
  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
    return null;
  }

  if (!config || (config.mode ?? "").toLowerCase() !== "real") {
    return null;
  }

  const network = config.network?.trim().toLowerCase();
  if (!network) return null;

  if (network.includes("fuji") || network.includes("test")) {
    return `https://testnet.snowtrace.io/tx/${txHash}`;
  }

  if (network.includes("avax") || network.includes("avalanche") || network.includes("mainnet") || network.includes("c-chain")) {
    return `https://snowtrace.io/tx/${txHash}`;
  }

  return null;
}

function isMockHash(txHash: string): boolean {
  return /^0xmock_/i.test(txHash);
}

export function showMatchList(root: HTMLElement, state: TournamentState) {
  root.innerHTML = "";
  const container = createMatchList(state);
  root.appendChild(container);

  const playBtn = container.querySelector<HTMLButtonElement>("#play");
  if (playBtn && state.active) {
    playBtn.addEventListener("click", () => {
      playNextMatch(root, state);
    });
  }
}
