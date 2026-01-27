// DDPromptSelector - Quick-start analysis prompts
import { useState } from 'react';
import { ChevronDown, ChevronUp, Play, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { DD_PROMPT_TEMPLATES, DD_CATEGORIES, type DDPromptTemplate } from '../../lib/dd-prompts';

interface DDPromptSelectorProps {
  onSelectPrompt: (prompt: string, templateId: string) => void;
  completedTemplates?: string[];
  disabled?: boolean;
}

export function DDPromptSelector({
  onSelectPrompt,
  completedTemplates = [],
  disabled = false,
}: DDPromptSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredTemplates = selectedCategory
    ? DD_PROMPT_TEMPLATES.filter(t => t.category === selectedCategory)
    : DD_PROMPT_TEMPLATES;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🔍</span>
          <span className="font-medium text-zinc-200">DD Analysis Templates</span>
          <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">
            {completedTemplates.length}/{DD_PROMPT_TEMPLATES.length} done
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-zinc-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-zinc-500" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4">
          {/* Category filter */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            <button
              onClick={() => setSelectedCategory(null)}
              className={cn(
                'px-2 py-1 text-xs rounded transition-colors',
                selectedCategory === null
                  ? 'bg-zinc-700 text-zinc-200'
                  : 'bg-zinc-800/50 text-zinc-500 hover:text-zinc-300'
              )}
            >
              All
            </button>
            {DD_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  'px-2 py-1 text-xs rounded transition-colors',
                  selectedCategory === cat.id
                    ? 'bg-zinc-700 text-zinc-200'
                    : 'bg-zinc-800/50 text-zinc-500 hover:text-zinc-300'
                )}
              >
                {cat.icon} {cat.name}
              </button>
            ))}
          </div>

          {/* Template grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            {filteredTemplates.map(template => (
              <PromptCard
                key={template.id}
                template={template}
                isCompleted={completedTemplates.includes(template.id)}
                disabled={disabled}
                onSelect={() => onSelectPrompt(template.prompt, template.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface PromptCardProps {
  template: DDPromptTemplate;
  isCompleted: boolean;
  disabled: boolean;
  onSelect: () => void;
}

function PromptCard({ template, isCompleted, disabled, onSelect }: PromptCardProps) {
  const [showChecklist, setShowChecklist] = useState(false);

  return (
    <div
      className={cn(
        'relative group rounded-lg border transition-all',
        isCompleted
          ? 'bg-emerald-500/5 border-emerald-500/20'
          : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600',
        disabled && 'opacity-50'
      )}
    >
      {/* Main content */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <span className="text-base">{template.icon}</span>
            <span className="text-sm font-medium text-zinc-200">{template.shortName}</span>
          </div>
          {isCompleted && (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          )}
        </div>

        <p className="text-xs text-zinc-500 mb-3 line-clamp-2">
          {template.description}
        </p>

        {/* Checklist preview */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowChecklist(!showChecklist);
          }}
          className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors mb-2"
        >
          {showChecklist ? 'Hide' : 'Show'} checklist ({template.checklist.length} items)
        </button>

        {showChecklist && (
          <ul className="text-xs text-zinc-500 space-y-0.5 mb-2 pl-1">
            {template.checklist.map((item, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="text-zinc-600 mt-0.5">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Run button */}
        <button
          onClick={onSelect}
          disabled={disabled}
          className={cn(
            'w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors',
            disabled
              ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
              : isCompleted
              ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
              : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
          )}
        >
          <Play className="w-3 h-3" />
          {isCompleted ? 'Run Again' : 'Run Analysis'}
        </button>
      </div>
    </div>
  );
}
