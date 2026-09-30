export type GameResult = 'win' | 'lose' | 'tie';

export interface PlayerProfile {
  username: string;
  stats: {
    gamesPlayed: number;
    totalScore: number;
    bestScore: number | null;
    wins: number;
    losses: number;
    ties: number;
  };
  games: { id: number; score: number; result: GameResult; playedAt: string }[];
}

export interface LeaderboardEntry {
  id: number;
  username: string;
  score: number;
  result: GameResult;
  playedAt: string;
}

async function request<T = PlayerProfile>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new Error('Cannot reach the game server');
  }
  const body = await res.json().catch(() => null);
  // No JSON body means the request never reached our API (e.g. Vite's proxy got no answer on :3001)
  if (!body) throw new Error('Cannot reach the game server — is `npm run server` running?');
  if (!res.ok) throw new Error(body.error ?? 'Something went wrong');
  return body;
}

function post(url: string, data: unknown) {
  return request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export const login = (username: string) => post('/api/login', { username });

export const saveScore = (username: string, score: number, result: GameResult) =>
  post('/api/scores', { username, score, result });

export const clearScores = (username: string) =>
  request(`/api/users/${encodeURIComponent(username)}/scores`, { method: 'DELETE' });

export const getLeaderboard = () => request<LeaderboardEntry[]>('/api/leaderboard');
