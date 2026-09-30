import { useEffect, useState } from 'react';
import { getLeaderboard, type LeaderboardEntry } from '../api';

interface LeaderboardProps {
  // Bump to refetch, e.g. after a round is saved
  refreshKey?: number;
  highlight?: string;
}

const MEDALS = ['🥇', '🥈', '🥉'];

export function Leaderboard({ refreshKey = 0, highlight }: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getLeaderboard()
      .then((rows) => {
        setEntries(rows);
        setError('');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load leaderboard'));
  }, [refreshKey]);

  return (
    <div style={{ maxWidth: '28rem' }} className="mt-4 w-full p-6 bg-amber-200/80 backdrop-blur-sm rounded-xl shadow-lg border-2 border-amber-400 text-amber-900">
      <h2 className="text-lg mb-4 text-center">🏆 Top 10 Treasure Hunts</h2>
      {error ? (
        <p className="text-sm text-center text-red-600">{error}</p>
      ) : entries === null ? (
        <p className="text-sm text-center text-amber-700">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-center text-amber-700">No games recorded yet.</p>
      ) : (
        <ol className="text-sm">
          {entries.map((entry, index) => {
            const isMe = highlight !== undefined && entry.username.toLowerCase() === highlight.toLowerCase();
            return (
              <li
                key={entry.id}
                className="flex flex-row justify-between gap-4 py-1 border-b border-amber-400"
                style={isMe ? { fontWeight: 600 } : undefined}
              >
                <span className="w-8 text-amber-700">{MEDALS[index] ?? `#${index + 1}`}</span>
                <span className="flex-1">{entry.username}</span>
                <span className="text-amber-700">
                  {/* SQLite stores UTC as "YYYY-MM-DD HH:MM:SS" */}
                  {new Date(entry.playedAt.replace(' ', 'T') + 'Z').toLocaleDateString()}
                </span>
                <span className={entry.score >= 0 ? 'text-green-600' : 'text-red-600'}>
                  ${entry.score}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
