// AIDiscussionControls - Controls for AI-to-AI discussion mode
import { Play, Square, MessageCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

interface AIDiscussionControlsProps {
  topic: string;
  onTopicChange: (topic: string) => void;
  maxTurns: number;
  onMaxTurnsChange: (turns: number) => void;
  currentTurn: number;
  isActive: boolean;
  currentModel: 'claude' | 'gemini' | null;
  onStart: () => void;
  onStop: () => void;
}

export function AIDiscussionControls({
  topic,
  onTopicChange,
  maxTurns,
  onMaxTurnsChange,
  currentTurn,
  isActive,
  currentModel,
  onStart,
  onStop,
}: AIDiscussionControlsProps) {
  return (
    <div className="border border-zinc-700 rounded-lg bg-zinc-800/50 p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <MessageCircle className="w-5 h-5 text-purple-400" />
        <h3 className="font-medium text-zinc-200">AI-to-AI Discussion</h3>
      </div>

      <div className="space-y-4">
        {/* Topic input */}
        <div>
          <label className="block text-xs text-zinc-400 mb-1.5">
            Discussion Topic
          </label>
          <input
            type="text"
            value={topic}
            onChange={e => onTopicChange(e.target.value)}
            disabled={isActive}
            placeholder="e.g., Analyze Apple's growth strategy and competitive position"
            className={cn(
              'w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md',
              'text-sm text-zinc-100 placeholder-zinc-500',
              'focus:outline-none focus:border-zinc-600',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          />
        </div>

        {/* Turn controls */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-xs text-zinc-400 mb-1.5">
              Number of Turns: {maxTurns}
            </label>
            <input
              type="range"
              min={1}
              max={20}
              value={maxTurns}
              onChange={e => onMaxTurnsChange(Number(e.target.value))}
              disabled={isActive}
              className="w-full accent-purple-500"
            />
            <div className="flex justify-between text-xs text-zinc-600 mt-1">
              <span>1</span>
              <span>10</span>
              <span>20</span>
            </div>
          </div>

          {/* Progress indicator */}
          {isActive && (
            <div className="flex-shrink-0 text-center">
              <div className="text-2xl font-bold text-purple-400">
                {currentTurn}/{maxTurns}
              </div>
              <div className="text-xs text-zinc-500">turns</div>
            </div>
          )}
        </div>

        {/* Status and controls */}
        <div className="flex items-center justify-between">
          <div>
            {isActive && currentModel && (
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'w-2 h-2 rounded-full animate-pulse',
                    currentModel === 'claude' ? 'bg-emerald-400' : 'bg-cyan-400'
                  )}
                />
                <span className="text-sm text-zinc-400">
                  {currentModel === 'claude' ? 'Claude' : 'Gemini'} is thinking...
                </span>
              </div>
            )}
            {!isActive && topic.length < 5 && (
              <span className="text-xs text-zinc-500">
                Enter a topic (at least 5 characters)
              </span>
            )}
          </div>

          {/* Start/Stop button */}
          {isActive ? (
            <button
              onClick={onStop}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg',
                'bg-red-500/20 text-red-400 hover:bg-red-500/30',
                'transition-colors'
              )}
            >
              <Square className="w-4 h-4" />
              Stop Discussion
            </button>
          ) : (
            <button
              onClick={onStart}
              disabled={topic.length < 5}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg',
                'transition-colors',
                topic.length >= 5
                  ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
                  : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
              )}
            >
              <Play className="w-4 h-4" />
              Start Discussion
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
