'use client';

import { useState, type ReactNode } from 'react';
import { ChevronRight, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { AdminContentTree } from '@/lib/types';
import { formatDuration } from './admin-client';

export type CreateLevel = 'season' | 'episode' | 'exercise';

interface ContentTreeProps {
  tree: AdminContentTree;
  onCreateChild: (level: CreateLevel, parentId: string) => void;
}

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

interface NodeProps {
  id: string;
  expanded: Set<string>;
  toggle: (id: string) => void;
  label: ReactNode;
  meta: ReactNode;
  action?: { label: string; onClick: () => void };
  children: ReactNode;
  depth: number;
}

function TreeNode({ id, expanded, toggle, label, meta, action, children, depth }: NodeProps) {
  const open = expanded.has(id);
  const contentId = `tree-${id}`;
  return (
    <Collapsible open={open} onOpenChange={() => undefined}>
      <div
        className="flex flex-wrap items-center gap-2 rounded-md py-1.5 pr-1 hover:bg-muted/50"
        style={{ paddingLeft: `${depth * 1}rem` }}
      >
        <CollapsibleTrigger
          type="button"
          aria-expanded={open}
          aria-controls={contentId}
          onClick={() => toggle(id)}
          className="flex min-w-0 flex-1 items-center gap-1.5 rounded-sm text-left text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <ChevronRight
            aria-hidden="true"
            className={`size-4 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`}
          />
          <span className="truncate">{label}</span>
        </CollapsibleTrigger>
        <span className="flex flex-wrap items-center gap-1.5">{meta}</span>
        {action && (
          <Button type="button" size="xs" variant="outline" onClick={action.onClick}>
            <Plus aria-hidden="true" />
            {action.label}
          </Button>
        )}
      </div>
      <CollapsibleContent id={contentId}>{children}</CollapsibleContent>
    </Collapsible>
  );
}

export function ContentTree({ tree, onCreateChild }: ContentTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (tree.series.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">No content yet. Create a series to get started.</p>;
  }

  const empty = (text: string, depth: number) => (
    <p className="py-1 text-xs text-muted-foreground" style={{ paddingLeft: `${depth + 1.5}rem` }}>
      {text}
    </p>
  );

  return (
    <div role="group" aria-label="Content hierarchy" className="grid gap-0.5">
      {tree.series.map((s) => (
        <TreeNode
          key={s.seriesId}
          id={s.seriesId}
          depth={0}
          expanded={expanded}
          toggle={toggle}
          label={s.title}
          meta={
            <>
              <Badge variant="outline" className="capitalize">
                {s.difficulty}
              </Badge>
              <Badge variant="secondary">{plural(s.totalEpisodes, 'episode')}</Badge>
            </>
          }
          action={{ label: 'Season', onClick: () => onCreateChild('season', s.seriesId) }}
        >
          {s.seasons.length === 0 && empty('No seasons yet', 0)}
          {s.seasons.map((se) => (
            <TreeNode
              key={se.seasonId}
              id={se.seasonId}
              depth={1.25}
              expanded={expanded}
              toggle={toggle}
              label={`Season ${se.seasonNumber}`}
              meta={<Badge variant="secondary">{plural(se.totalEpisodes, 'episode')}</Badge>}
              action={{ label: 'Episode', onClick: () => onCreateChild('episode', se.seasonId) }}
            >
              {se.episodes.length === 0 && empty('No episodes yet', 1.25)}
              {se.episodes.map((ep) => (
                <TreeNode
                  key={ep.episodeId}
                  id={ep.episodeId}
                  depth={2.5}
                  expanded={expanded}
                  toggle={toggle}
                  label={`E${ep.episodeNumber} · ${ep.title}`}
                  meta={<Badge variant="secondary">{plural(ep.totalExercises, 'exercise')}</Badge>}
                  action={{ label: 'Exercise', onClick: () => onCreateChild('exercise', ep.episodeId) }}
                >
                  {ep.exercises.length === 0 && empty('No exercises yet', 2.5)}
                  {ep.exercises.map((ex) => (
                    <div
                      key={ex.exerciseId}
                      className="flex flex-wrap items-center gap-1.5 py-1 text-sm"
                      style={{ paddingLeft: '5.25rem' }}
                    >
                      <span className="min-w-0 flex-1 truncate">{ex.title}</span>
                      <Badge variant="outline">{ex.subtitleFormat.toUpperCase()}</Badge>
                      <Badge variant="outline">{plural(ex.totalSentences, 'sentence')}</Badge>
                      <Badge variant="outline">{formatDuration(ex.durationSeconds)}</Badge>
                    </div>
                  ))}
                </TreeNode>
              ))}
            </TreeNode>
          ))}
        </TreeNode>
      ))}
    </div>
  );
}
