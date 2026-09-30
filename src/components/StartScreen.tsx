import { useState, type FormEvent } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface StartScreenProps {
  onLogin: (username: string) => Promise<void>;
  onGuest: () => void;
}

export function StartScreen({ onLogin, onGuest }: StartScreenProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onLogin(name.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '24rem' }} className="w-full p-6 bg-amber-200/80 backdrop-blur-sm rounded-xl shadow-lg border-2 border-amber-400">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Label htmlFor="player-name" className="text-amber-900">
          Your name
        </Label>
        <Input
          id="player-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. captain_jack"
          maxLength={20}
          autoFocus
          style={{ backgroundColor: 'white' }}
        />
        <p className="text-sm text-amber-700">
          New name? We'll create it. Used before? Your scores are waiting.
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button
          type="submit"
          disabled={loading || !name.trim()}
          className="bg-amber-600 hover:bg-amber-700 text-white"
        >
          {loading ? 'Starting…' : 'Start'}
        </Button>
      </form>
      <div className="mt-4 mb-4 text-center text-sm text-amber-700">or</div>
      <Button variant="outline" onClick={onGuest} className="w-full">
        Play as Guest
      </Button>
      <p className="mt-2 text-center text-xs text-amber-600">Guest scores are not saved.</p>
    </div>
  );
}
