import { useState } from 'react';
import { Check, Copy, Eye, EyeSlash as EyeOff } from '@phosphor-icons/react';
import type { ExtraField } from '@strongroom/shared/types';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import './tasks.css';

/** Read-only fields on cards, identities and SSH keys. Copy goes through the app so the clipboard clears. */
export function ExtraFields({
  itemId,
  fields,
  label = 'Item details',
  kind = 'extra',
}: {
  itemId: string;
  fields: ExtraField[];
  label?: string;
  kind?: 'extra' | 'custom';
}) {
  const [shown, setShown] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState<number | null>(null);
  const [error, setError] = useState('');

  async function copy(index: number) {
    setError('');
    try {
      const result = await (kind === 'custom'
        ? window.strongroom.copyCustomField(itemId, index)
        : window.strongroom.copyExtra(itemId, index));
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
      aria-label={label}
      className="task-credentials rounded-lg border border-border bg-card"
    >
      {fields.map((field, index) => {
        const visible = !field.secret || shown.has(index);
        const multiline = field.value.includes('\n');
        return (
          <div key={`${index}-${field.label}`}>
            {index > 0 && <Separator />}
            <div className="task-credential">
              <div>
                <p className="text-xs text-muted-foreground">{field.label}</p>
                <span
                  className={`field-value text-sm${field.secret || multiline ? ' font-mono' : ''}`}
                  style={multiline ? { whiteSpace: 'pre-wrap', wordBreak: 'break-all' } : undefined}
                >
                  {visible ? field.value : '••••••••••••'}
                </span>
              </div>
              <div className="task-actions">
                {field.secret && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`${visible ? 'Hide' : 'Reveal'} ${field.label.toLowerCase()}`}
                    aria-pressed={visible}
                    onClick={() => toggle(index)}
                  >
                    {visible ? <EyeOff /> : <Eye />}
                  </Button>
                )}
                {field.copyable !== false && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Copy ${field.label.toLowerCase()}`}
                    onClick={() => void copy(index)}
                  >
                    {copied === index ? <Check /> : <Copy />}
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </section>
  );
}
