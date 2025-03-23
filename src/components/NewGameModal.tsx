'use client';

import { useState } from 'react';

interface NewGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGame: (time: number, increment: number, rated: boolean) => void;
}

export default function NewGameModal({ isOpen, onClose, onCreateGame }: NewGameModalProps) {
  const [timeControl, setTimeControl] = useState('blitz');
  const [rated, setRated] = useState(false);

  const timeControls = {
    bullet: { time: 1, increment: 0 },    // 1+0
    blitz: { time: 3, increment: 2 },     // 3+2
    rapid: { time: 10, increment: 0 },    // 10+0
    classical: { time: 15, increment: 10 }, // 15+10
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedTime = timeControls[timeControl as keyof typeof timeControls];
    onCreateGame(selectedTime.time, selectedTime.increment, rated);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">New Game</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Time Control
            </label>
            <select
              value={timeControl}
              onChange={(e) => setTimeControl(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="bullet">Bullet (1+0)</option>
              <option value="blitz">Blitz (3+2)</option>
              <option value="rapid">Rapid (10+0)</option>
              <option value="classical">Classical (15+10)</option>
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="rated"
              checked={rated}
              onChange={(e) => setRated(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="rated" className="text-sm font-medium text-gray-700">
              Rated Game
            </label>
          </div>

          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Create Game
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 