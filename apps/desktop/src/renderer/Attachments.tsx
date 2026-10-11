import { useRef, useState } from 'react';
import { DownloadSimple, Paperclip, Plus, Trash } from '@phosphor-icons/react';
import type { ItemDetail } from '@strongroom/shared/types';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import './tasks.css';

/** Files attached to an item. Every action runs through the Bitwarden CLI in the main process. */
export function Attachments({
  item,
  onUpdated,
}: {
  item: ItemDetail;
  onUpdated: (item: ItemDetail) => void;
}) {
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const working = useRef(false);
  const manage = !item.restorable;

  async function run(key: string, action: () => Promise<void>) {
    if (working.current) return;
    working.current = true;
    setBusy(key);
    setMessage('');
    try {
      await action();
    } catch {
      setMessage('Something went wrong. Try again.');
    } finally {
      working.current = false;
      setBusy('');
    }
  }

  const download = (id: string) =>
    run(id, async () => {
      const result = await window.strongroom.downloadAttachment(item.id, id);
      if (!result.ok) setMessage(result.error);
      else if (result.value) setMessage('Saved.');
    });

  const remove = (id: string) =>
    run(id, async () => {
      const confirmation = await window.strongroom.confirm('deleteAttachment');
      if (!confirmation.ok) return setMessage(confirmation.error);
      if (!confirmation.value) return;
      const result = await window.strongroom.deleteAttachment(item.id, id);
      if (result.ok) onUpdated(result.value);
      else setMessage(result.error);
    });

  const add = () =>
    run('add', async () => {
      const result = await window.strongroom.addAttachment(item.id);
      if (!result.ok) setMessage(result.error);
      else if (result.value) onUpdated(result.value);
    });

  if (!item.attachments.length && !manage) return null;
  return (
    <section
      aria-label="Attachments"
      className="task-credentials rounded-lg border border-border bg-card"
    >
      <h3 className="text-xs text-muted-foreground">
        <Paperclip /> Attachments
      </h3>
      {item.attachments.map((file, index) => (
        <div key={file.id}>
          {index > 0 && <Separator />}
          <div className="task-credential">
            <div>
              <span className="field-value text-sm">{file.fileName}</span>
              {file.size && <p className="text-xs text-muted-foreground">{file.size}</p>}
            </div>
            <div className="task-actions">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Download ${file.fileName}`}
                disabled={!!busy}
                onClick={() => void download(file.id)}
              >
                <DownloadSimple />
              </Button>
              {manage && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Delete ${file.fileName}`}
                  disabled={!!busy}
                  onClick={() => void remove(file.id)}
                >
                  <Trash />
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}
      {manage && (
        <Button type="button" variant="ghost" disabled={!!busy} onClick={() => void add()}>
          <Plus /> Add attachment
        </Button>
      )}
      {message && (
        <p role="status" className="text-xs text-muted-foreground">
          {message}
        </p>
      )}
    </section>
  );
}
