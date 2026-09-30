import express from 'express';
import { db } from './db';

const PORT = 3001;
const USERNAME_RE = /^[A-Za-z0-9_]{2,20}$/;
const RESULTS = ['win', 'lose', 'tie'];

interface User {
  id: number;
  username: string;
}

const findUser = db.prepare<[string], User>('SELECT id, username FROM users WHERE username = ?');
const insertUser = db.prepare<[string]>('INSERT INTO users (username) VALUES (?)');
const insertScore = db.prepare<[number, number, string]>(
  'INSERT INTO scores (user_id, score, result) VALUES (?, ?, ?)',
);
const statsFor = db.prepare<[number]>(`
  SELECT
    COUNT(*) AS gamesPlayed,
    COALESCE(SUM(score), 0) AS totalScore,
    MAX(score) AS bestScore,
    COALESCE(SUM(result = 'win'), 0) AS wins,
    COALESCE(SUM(result = 'lose'), 0) AS losses,
    COALESCE(SUM(result = 'tie'), 0) AS ties
  FROM scores WHERE user_id = ?
`);
const gamesFor = db.prepare<[number]>(
  'SELECT id, score, result, played_at AS playedAt FROM scores WHERE user_id = ? ORDER BY id DESC',
);
const topScores = db.prepare(`
  SELECT s.id, u.username, s.score, s.result, s.played_at AS playedAt
  FROM scores s JOIN users u ON u.id = s.user_id
  ORDER BY s.score DESC, s.id ASC
  LIMIT 10
`);
const deleteScores = db.prepare<[number]>('DELETE FROM scores WHERE user_id = ?');

function profile(user: User) {
  return { username: user.username, stats: statsFor.get(user.id), games: gamesFor.all(user.id) };
}

const app = express();
app.use(express.json());

// Sign up and sign in are the same step: find the name, or create it.
app.post('/api/login', (req, res) => {
  const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
  if (!USERNAME_RE.test(username)) {
    res.status(400).json({ error: 'Name must be 2–20 letters, numbers or _' });
    return;
  }
  let user = findUser.get(username);
  if (!user) {
    insertUser.run(username);
    user = findUser.get(username)!;
  }
  res.json(profile(user));
});

app.get('/api/users/:username', (req, res) => {
  const user = findUser.get(req.params.username);
  if (!user) {
    res.status(404).json({ error: 'Player not found' });
    return;
  }
  res.json(profile(user));
});

app.post('/api/scores', (req, res) => {
  const { username, score, result } = req.body ?? {};
  const user = typeof username === 'string' ? findUser.get(username) : undefined;
  if (!user) {
    res.status(404).json({ error: 'Player not found' });
    return;
  }
  // A round can end anywhere between two skeletons (-150) and the treasure (+100).
  if (!Number.isInteger(score) || score < -150 || score > 100 || !RESULTS.includes(result)) {
    res.status(400).json({ error: 'Invalid score' });
    return;
  }
  insertScore.run(user.id, score, result);
  res.json(profile(user));
});

// Best 10 rounds across every player; on equal scores, whoever got there first ranks higher.
app.get('/api/leaderboard', (_req, res) => {
  res.json(topScores.all());
});

// Clears a player's game history; the player name itself is kept.
app.delete('/api/users/:username/scores', (req, res) => {
  const user = findUser.get(req.params.username);
  if (!user) {
    res.status(404).json({ error: 'Player not found' });
    return;
  }
  deleteScores.run(user.id);
  res.json(profile(user));
});

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
