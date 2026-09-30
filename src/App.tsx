import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Button } from './components/ui/button';
import closedChest from './assets/treasure_closed.png';
import treasureChest from './assets/treasure_opened.png';
import skeletonChest from './assets/treasure_opened_skeleton.png';
import chestOpenSound from './audios/chest_open.mp3';
import evilLaughSound from './audios/chest_open_with_evil_laugh.mp3';
import keyCursor from './assets/key.png';
import { StartScreen } from './components/StartScreen';
import { Leaderboard } from './components/Leaderboard';
import { login, saveScore, clearScores, type PlayerProfile } from './api';

interface Box {
  id: number;
  isOpen: boolean;
  hasTreasure: boolean;
  value: number;
}

type Player = { mode: 'user'; username: string } | { mode: 'guest' };

const SAVED_NAME_KEY = 'treasure-game:username';

function readSavedName(): string | null {
  try {
    return localStorage.getItem(SAVED_NAME_KEY);
  } catch {
    return null;
  }
}

function writeSavedName(name: string | null) {
  try {
    if (name) localStorage.setItem(SAVED_NAME_KEY, name);
    else localStorage.removeItem(SAVED_NAME_KEY);
  } catch {
    // Storage unavailable (private mode etc.) — the player just re-enters their name next time.
  }
}

export default function App() {
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [score, setScore] = useState(0);
  const [gameEnded, setGameEnded] = useState(false);
  const [player, setPlayer] = useState<Player | null>(null);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [restoring, setRestoring] = useState(() => readSavedName() !== null);
  const [saveError, setSaveError] = useState('');
  const [leaderboardKey, setLeaderboardKey] = useState(0);

  const initializeGame = () => {
    // Randomly assign treasure to one box; the other two are skeletons worth -50 and -100
    const treasureBoxIndex = Math.floor(Math.random() * 3);
    const skeletonValues = Math.random() < 0.5 ? [-50, -100] : [-100, -50];
    let skeletonCount = 0;
    const newBoxes: Box[] = Array.from({ length: 3 }, (_, index) => {
      const hasTreasure = index === treasureBoxIndex;
      return {
        id: index,
        isOpen: false,
        hasTreasure,
        value: hasTreasure ? 100 : skeletonValues[skeletonCount++],
      };
    });
    
    setBoxes(newBoxes);
    setScore(0);
    setGameEnded(false);
  };

  // Initialize game automatically when component mounts
  useEffect(() => {
    initializeGame();
  }, []);

  // Log the last named player back in after a reload
  useEffect(() => {
    const savedName = readSavedName();
    if (!savedName) return;
    handleLogin(savedName)
      .catch(() => writeSavedName(null))
      .finally(() => setRestoring(false));
  }, []);

  const handleLogin = async (username: string) => {
    const loggedIn = await login(username);
    writeSavedName(loggedIn.username);
    setProfile(loggedIn);
    setPlayer({ mode: 'user', username: loggedIn.username });
    setSaveError('');
    initializeGame();
  };

  const handleGuest = () => {
    setProfile(null);
    setPlayer({ mode: 'guest' });
    initializeGame();
  };

  const clearRecords = async () => {
    if (player?.mode !== 'user') return;
    if (!window.confirm(`Delete all ${profile?.stats.gamesPlayed ?? 0} game records for ${player.username}? This cannot be undone.`)) return;
    try {
      setProfile(await clearScores(player.username));
      setLeaderboardKey((k) => k + 1);
      setSaveError('');
    } catch (err) {
      setSaveError(`Records not cleared: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  };

  const switchPlayer = () => {
    writeSavedName(null);
    setProfile(null);
    setPlayer(null);
  };

  const openBox = (boxId: number) => {
    if (gameEnded) return;

    const clickedBox = boxes.find(box => box.id === boxId);
    if (clickedBox && !clickedBox.isOpen) {
      new Audio(clickedBox.hasTreasure ? chestOpenSound : evilLaughSound).play();
    }

    setBoxes(prevBoxes => {
      const updatedBoxes = prevBoxes.map(box => {
        if (box.id === boxId && !box.isOpen) {
          const newScore = score + box.value;
          setScore(newScore);
          return { ...box, isOpen: true };
        }
        return box;
      });
      
      // Check if treasure is found, two skeletons are opened (loss), or all boxes are opened
      const treasureFound = updatedBoxes.some(box => box.isOpen && box.hasTreasure);
      const skeletonsOpened = updatedBoxes.filter(box => box.isOpen && !box.hasTreasure).length;
      const allOpened = updatedBoxes.every(box => box.isOpen);
      if (treasureFound || skeletonsOpened >= 2 || allOpened) {
        setGameEnded(true);
      }
      
      return updatedBoxes;
    });
  };

  const result: 'win' | 'lose' | 'tie' = score > 0 ? 'win' : score < 0 ? 'lose' : 'tie';

  // Save each finished round for named players; guest rounds are not kept
  useEffect(() => {
    if (!gameEnded || player?.mode !== 'user') return;
    saveScore(player.username, score, result)
      .then((updated) => {
        setProfile(updated);
        setLeaderboardKey((k) => k + 1);
        setSaveError('');
      })
      .catch((err) => setSaveError(`Score not saved: ${err.message}`));
  }, [gameEnded]);

  const resetGame = () => {
    initializeGame();
  };

  const title = (
    <div className="text-center mb-8">
      <h1 className="text-4xl mb-4 text-amber-900">🏴‍☠️ Treasure Hunt Game 🏴‍☠️</h1>
      <p className="text-amber-800 mb-4">
        Click on the treasure chests to discover what's inside!
      </p>
      <p className="text-amber-700 text-sm">
        💰 Treasure: +$100 | 💀 Skeleton: -$50 or -$100
      </p>
    </div>
  );

  if (restoring || !player) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-amber-100 flex flex-col items-center justify-center p-8">
        {title}
        {restoring ? (
          <p className="text-amber-700">Loading your treasure log…</p>
        ) : (
          <>
            <StartScreen onLogin={handleLogin} onGuest={handleGuest} />
            <Leaderboard />
          </>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-amber-100 flex flex-col items-center justify-center p-8">
      {title}

      <div className="mb-4 flex flex-row items-center gap-4 text-amber-900">
        <span>
          Playing as <strong>{player.mode === 'user' ? player.username : 'Guest'}</strong>
        </span>
        <Button variant="outline" size="sm" onClick={switchPlayer}>
          Switch player
        </Button>
      </div>

      <div className="mb-8 flex flex-row items-center justify-center gap-6">
        {/* Spacer matching the result slot so the score box stays centered */}
        <div className="min-w-[8rem]" />
        <div className="text-2xl text-center p-4 bg-amber-200/80 backdrop-blur-sm rounded-lg shadow-lg border-2 border-amber-400">
          <span className="text-amber-900">Current Score: </span>
          <span className={`${score >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${score}
          </span>
        </div>
        <div className="min-w-[8rem]">
          {gameEnded && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className={`text-2xl text-center p-4 rounded-lg shadow-lg border-2 ${
                result === 'win'
                  ? 'bg-green-100 text-green-800 border-green-300'
                  : result === 'lose'
                    ? 'bg-red-100 text-red-800 border-red-300'
                    : 'bg-amber-200/80 text-amber-900 border-amber-400'
              }`}
            >
              {result === 'win' ? '贏' : result === 'lose' ? '輸' : '平手'}
            </motion.div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {boxes.map((box) => (
              <motion.div
                key={box.id}
                className="flex flex-col items-center"
                style={{ cursor: `url(${keyCursor}) 0 0, pointer` }}
                whileHover={{ scale: box.isOpen ? 1 : 1.05 }}
                whileTap={{ scale: box.isOpen ? 1 : 0.95 }}
                onClick={() => openBox(box.id)}
              >
                <motion.div
                  initial={{ rotateY: 0 }}
                  animate={{ 
                    rotateY: box.isOpen ? 180 : 0,
                    scale: box.isOpen ? 1.1 : 1
                  }}
                  transition={{ 
                    duration: 0.6,
                    ease: "easeInOut"
                  }}
                  className="relative"
                >
                  <img
                    src={box.isOpen 
                      ? (box.hasTreasure ? treasureChest : skeletonChest)
                      : closedChest
                    }
                    alt={box.isOpen 
                      ? (box.hasTreasure ? "Treasure!" : "Skeleton!")
                      : "Treasure Chest"
                    }
                    className="w-48 h-48 object-contain drop-shadow-lg"
                  />
                  
                  {box.isOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3, duration: 0.5 }}
                      className="absolute -top-8 left-1/2 transform -translate-x-1/2"
                    >
                      {box.hasTreasure ? (
                        <div className="text-2xl animate-bounce">✨💰✨</div>
                      ) : (
                        <div className="text-2xl animate-pulse">💀👻💀</div>
                      )}
                    </motion.div>
                  )}
                </motion.div>
                
                <div className="mt-4 text-center">
                  {box.isOpen ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4, duration: 0.3 }}
                      className={`text-lg p-2 rounded-lg ${
                        box.hasTreasure 
                          ? 'bg-green-100 text-green-800 border border-green-300' 
                          : 'bg-red-100 text-red-800 border border-red-300'
                      }`}
                    >
                      {box.value > 0 ? `+$${box.value}` : `-$${-box.value}`}
                    </motion.div>
                  ) : (
                    <div className="text-amber-700 p-2">
                      Click to open!
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
      </div>

      {gameEnded && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <div className="mb-4 p-6 bg-amber-200/80 backdrop-blur-sm rounded-xl shadow-lg border-2 border-amber-400">
                <h2 className="text-2xl mb-2 text-amber-900">Game Over!</h2>
                <p className="text-lg text-amber-800">
                  Final Score: <span className={`${score >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${score}
                  </span>
                </p>
                <p className="text-sm text-amber-600 mt-2">
                  {boxes.some(box => box.isOpen && box.hasTreasure) 
                    ? 'Treasure found! Well done, treasure hunter! 🎉' 
                    : 'No treasure found this time! Better luck next time! 💀'}
                </p>
              </div>
              
              <Button 
                onClick={resetGame}
                className="text-lg px-8 py-4 bg-amber-600 hover:bg-amber-700 text-white"
              >
                Play Again
              </Button>
            </motion.div>
          )}

      {saveError && <p className="mt-4 text-sm text-red-600">{saveError}</p>}

      {player.mode === 'guest' ? (
        <p className="mt-4 text-sm text-amber-700">
          Playing as a guest — scores aren't saved.{' '}
          <button style={{ textDecoration: 'underline' }} onClick={switchPlayer}>
            Enter a name to save your scores
          </button>
        </p>
      ) : (
        profile && (
          <div style={{ maxWidth: '28rem' }} className="mt-4 w-full p-6 bg-amber-200/80 backdrop-blur-sm rounded-xl shadow-lg border-2 border-amber-400 text-amber-900">
            <h2 className="text-lg mb-4 text-center">{profile.username}'s Treasure Log</h2>
            <div className="flex flex-row gap-4 text-center mb-4">
              <div className="flex-1">
                <div className="text-sm text-amber-700">Games</div>
                <div className="text-2xl">{profile.stats.gamesPlayed}</div>
              </div>
              <div className="flex-1">
                <div className="text-sm text-amber-700">Total</div>
                <div className={`text-2xl ${profile.stats.totalScore >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${profile.stats.totalScore}
                </div>
              </div>
              <div className="flex-1">
                <div className="text-sm text-amber-700">Best</div>
                <div className="text-2xl">
                  {profile.stats.bestScore === null ? '—' : `$${profile.stats.bestScore}`}
                </div>
              </div>
            </div>
            <p className="text-sm text-center text-amber-700 mb-4">
              {profile.stats.wins} won · {profile.stats.losses} lost · {profile.stats.ties} tied
            </p>
            {profile.games.length === 0 ? (
              <p className="text-sm text-center text-amber-700">No games recorded yet.</p>
            ) : (
              <ul className="text-sm" style={{ maxHeight: '20rem', overflowY: 'auto' }}>
                {profile.games.map((game, index) => (
                  <li key={game.id} className="flex flex-row justify-between gap-4 py-1 border-b border-amber-400">
                    <span className="text-amber-700">#{profile.games.length - index}</span>
                    <span className="flex-1 text-amber-700">
                      {/* SQLite stores UTC as "YYYY-MM-DD HH:MM:SS" */}
                      {new Date(game.playedAt.replace(' ', 'T') + 'Z').toLocaleString()}
                    </span>
                    <span>{game.result === 'win' ? '贏' : game.result === 'lose' ? '輸' : '平手'}</span>
                    <span className={game.score >= 0 ? 'text-green-600' : 'text-red-600'}>
                      ${game.score}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {profile.games.length > 0 && (
              <Button variant="outline" onClick={clearRecords} className="w-full mt-4 text-red-600">
                Clear all records
              </Button>
            )}
          </div>
        )
      )}

      <Leaderboard
        refreshKey={leaderboardKey}
        highlight={player.mode === 'user' ? player.username : undefined}
      />
    </div>
  );
}
