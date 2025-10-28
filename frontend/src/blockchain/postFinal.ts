export interface FinalMatchData {
  tournament_id: number;
  winner_alias: string;
  score_a: number;
  score_b: number;
  points_to_win: number;
}

export interface BlockchainConfig {
  enabled: boolean;
  mode: string;
  ready: boolean;
  network: string | null;
  registryAddress: string | null;
  explorerBaseUrl: string | null;
}

export interface PostFinalResponse {
  txHash?: string;
  blockchainConfig: BlockchainConfig | null;
}

let cachedConfig: BlockchainConfig | null = null;
let pendingConfig: Promise<BlockchainConfig | null> | null = null;

async function fetchBlockchainConfig(token: string): Promise<BlockchainConfig | null> {
  if (cachedConfig) return cachedConfig;
  if (!pendingConfig) {
    pendingConfig = fetch("/api/blockchain/config", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as BlockchainConfig;
      })
      .catch(() => null)
      .finally(() => {
        pendingConfig = null;
      });
  }

  const config = await pendingConfig;
  if (config) cachedConfig = config;
  return config;
}

export async function postFinalToChain({
  tournament_id,
  winner_alias,
  score_a,
  score_b,
  points_to_win,
}: FinalMatchData): Promise<PostFinalResponse> {
  const token = localStorage.getItem("auth_token");
  if (!token) throw new Error("User not logged in");
  const res = await fetch("/api/blockchain/finals", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tournament_id,
      winner_alias,
      score_a,
      score_b,
      points_to_win,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to post to blockchain");
  }

  const data = (await res.json()) as { txHash?: string };
  console.log("Blockchain response:", data); // Debug print

  let blockchainConfig: BlockchainConfig | null = null;
  try {
    blockchainConfig = await fetchBlockchainConfig(token);
  } catch (err) {
    console.warn("Failed to load blockchain config:", err);
  }

  return { ...data, blockchainConfig };
}