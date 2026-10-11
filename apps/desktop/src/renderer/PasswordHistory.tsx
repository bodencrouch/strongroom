import { useState } from 'react';
import { CaretDown, Check, Copy, Eye, EyeSlash as EyeOff } from '@phosphor-icons/react';
import type { PasswordHistoryEntry } from '@strongroom/shared/types';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import './tasks.css';

function formatDate(value: string | null) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleString() : 'Date unknown';
}

/** Earlier passwords of a login, newest first. Copy goes through the app so the clipboard clears. */
export function PasswordHistory({
  itemId,
  entries,
}: {
  itemId: string;
  entries: PasswordHistoryEntry[];
}) {
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState<number | null>(null);
  const [error, setError] = useState('');

  async function copy(index: number) {
    setError('');
    try {
      const result = await window.strongroom.copyHistory(itemId, index);
      if (result.ok) setCopied(index);
      else setError(result.error);
    } catch {
      setError('Could not copy. Try again.');
    }
  }

  function toggle(index: number) {
    setShown((current) => {
      const next = new Set(current);
      if (!next.delete(index)) next.add(index);
      return next;
    });
  }

  return (
    <section
      aria-label="Password history"
      className="task-credentials rounded-lg border border-border bg-card"
    >
      <Button
        type="button"
        variant="ghost"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <CaretDown style={{ transform: open ? undefined : 'rotate(-90deg)' }} />
        Password history ({entries.length})
      </Button>
      {open &&
        entries.map((entry, index) => {
          const visible = shown.has(index);
          return (
            <div key={`${index}-${entry.lastUsedDate}`}>
              <Separator />
              <div className="task-credential">
                <div>
                  <p className="text-xs text-muted-foreground">{formatDate(entry.lastUsedDate)}</p>
                  <span className="field-value text-sm font-mono">
                    {visible ? entry.password : '••••••••••••'}
                  </span>
                </div>
                <div className="task-actions">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={visible ? 'Hide old password' : 'Reveal old password'}
                    aria-pressed={visible}
                    onClick={() => toggle(index)}
                  >
                    {visible ? <EyeOff /> : <Eye />}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Copy old password"
                    onClick={() => void copy(index)}
                  >
                    {copied === index ? <Check /> : <Copy />}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </section>
  );
}
