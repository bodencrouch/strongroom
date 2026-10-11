import { useCallback, useEffect, useRef, useState } from 'react';
import { LinkSimple, PaperPlaneTilt, Plus, Trash } from '@phosphor-icons/react';
import type { SendDraft, SendSummary } from '@strongroom/shared/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Spinner } from '@/components/ui/spinner';
import { Separator } from '@/components/ui/separator';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Field, FieldContent, FieldDescription, FieldLabel } from '@/components/ui/field';
import './tasks.css';

const deleteChoices = [1, 2, 3, 7, 14, 30] as const;
const expireChoices = [null, 1, 2, 3, 7, 14, 30] as const;
const emptyDraft = {
  type: 'text' as 'text' | 'file',
  name: '',
  text: '',
  hidden: false,
  notes: '',
  deleteInDays: 7 as number,
  expireInDays: null as number | null,
  maxAccessCount: '',
  password: '',
  disabled: false,
  hideEmail: false,
};

function describe(send: SendSummary) {
  const parts = [send.type === 1 ? (send.fileName ?? 'File') : 'Text'];
  if (send.deletionDate) parts.push(`deletes ${new Date(send.deletionDate).toLocaleDateString()}`);
  parts.push(
    send.maxAccessCount === null
      ? `opened ${send.accessCount} times`
      : `opened ${send.accessCount} of ${send.maxAccessCount}`,
  );
  if (send.passwordSet) parts.push('password set');
  if (send.disabled) parts.push('turned off');
  return parts.join(' · ');
}

/** The account's Sends. Links, text and passwords stay in the main process. */
export function Sends() {
  const [sends, setSends] = useState<SendSummary[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const working = useRef(false);
  const alive = useRef(true);

  const load = useCallback(async () => {
    try {
      const result = await window.strongroom.sends();
      if (!alive.current) return;
      if (result.ok) setSends(result.value);
      else setMessage(result.error);
    } catch {
      if (alive.current) setMessage('Could not load your Sends. Try again.');
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    void load();
    // A locked vault drops everything shown here at once.
    const unsubscribe = window.strongroom.onState((state) => {
      if (state.status !== 'unlocked') {
        alive.current = false;
        setSends(null);
        setDraft(emptyDraft);
      }
    });
    return () => {
      alive.current = false;
      unsubscribe();
    };
  }, [load]);

  async function run(key: string, action: () => Promise<void>) {
    if (working.current) return;
    working.current = true;
    setBusy(key);
    setMessage('');
    try {
      await action();
    } catch {
      if (alive.current) setMessage('Something went wrong. Try again.');
    } finally {
      working.current = false;
      if (alive.current) setBusy('');
    }
  }

  const create = () =>
    run('create', async () => {
      const count = draft.maxAccessCount.trim();
      const max = count ? Number(count) : null;
      if (max !== null && (!Number.isInteger(max) || max < 1))
        return setMessage('Use a whole number of at least 1 for the access limit.');
      const base = {
        name: draft.name.trim(),
        notes: draft.notes,
        deleteInDays: draft.deleteInDays,
        expireInDays: draft.expireInDays,
        maxAccessCount: max,
        password: draft.password,
        disabled: draft.disabled,
        hideEmail: draft.hideEmail,
      };
      const request: SendDraft =
        draft.type === 'text'
          ? { ...base, type: 'text', text: draft.text, hidden: draft.hidden }
          : { ...base, type: 'file' };
      const result = await window.strongroom.createSend(request);
      if (!alive.current) return;
      if (!result.ok) return setMessage(result.error);
      // null means the person closed the file dialog.
      if (result.value) {
        setSends(result.value);
        setDraft(emptyDraft);
        setCreating(false);
        setMessage('Send created.');
      }
    });

  const copyLink = (send: SendSummary) =>
    run(send.id, async () => {
      const result = await window.strongroom.copySendLink(send.id);
      setMessage(
        result.ok ? 'Link copied. It clears from the clipboard in 30 seconds.' : result.error,
      );
    });

  const removePassword = (send: SendSummary) =>
    run(send.id, async () => {
      const result = await window.strongroom.removeSendPassword(send.id);
      if (!alive.current) return;
      if (result.ok) setSends(result.value);
      else setMessage(result.error);
    });

  const remove = (send: SendSummary) =>
    run(send.id, async () => {
      const confirmation = await window.strongroom.confirm('deleteSend');
      if (!confirmation.ok) return setMessage(confirmation.error);
      if (!confirmation.value) return;
      const result = await window.strongroom.deleteSend(send.id);
      if (!alive.current) return;
      if (result.ok) setSends(result.value);
      else setMessage(result.error);
    });

  const canCreate =
    draft.name.trim() !== '' && (draft.type === 'file' || draft.text !== '') && !busy;

  return (
    <section className="detail-pane sends-panel" aria-label="Sends" aria-busy={sends === null}>
      <div className="task-settings-section" style={{ padding: 24, maxWidth: 640 }}>
        <div className="task-label-actions">
          <h2 className="text-base font-semibold">
            <PaperPlaneTilt /> Sends
          </h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!!busy || sends === null}
            onClick={() => setCreating((open) => !open)}
          >
            <Plus data-icon="inline-start" /> New Send
          </Button>
        </div>
        {creating && (
          <form
            className="task-settings-section rounded-lg border border-border bg-card"
            style={{ padding: 16 }}
            onSubmit={(event) => {
              event.preventDefault();
              if (canCreate) void create();
            }}
          >
            <Field>
              <FieldLabel htmlFor="send-name">Name</FieldLabel>
              <Input
                id="send-name"
                value={draft.name}
                maxLength={500}
                autoComplete="off"
                disabled={!!busy}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="send-type">Type</FieldLabel>
              <NativeSelect
                id="send-type"
                value={draft.type}
                disabled={!!busy}
                onChange={(event) =>
                  setDraft({ ...draft, type: event.target.value === 'file' ? 'file' : 'text' })
                }
              >
                <NativeSelectOption value="text">Text</NativeSelectOption>
                <NativeSelectOption value="file">File</NativeSelectOption>
              </NativeSelect>
            </Field>
            {draft.type === 'text' ? (
              <>
                <Field>
                  <FieldLabel htmlFor="send-text">Text to share</FieldLabel>
                  <Textarea
                    id="send-text"
                    className="task-notes"
                    value={draft.text}
                    maxLength={16_384}
                    disabled={!!busy}
                    onChange={(event) => setDraft({ ...draft, text: event.target.value })}
                  />
                </Field>
                <Field orientation="horizontal">
                  <FieldContent>
                    <FieldLabel htmlFor="send-hidden">Hide the text by default</FieldLabel>
                  </FieldContent>
                  <Switch
                    id="send-hidden"
                    checked={draft.hidden}
                    disabled={!!busy}
                    onCheckedChange={(hidden) => setDraft({ ...draft, hidden })}
                  />
                </Field>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                You choose the file when you create the Send. Bitwarden may require Premium for file
                Sends.
              </p>
            )}
            <Field>
              <FieldLabel htmlFor="send-delete">Delete after</FieldLabel>
              <NativeSelect
                id="send-delete"
                value={String(draft.deleteInDays)}
                disabled={!!busy}
                onChange={(event) =>
                  setDraft({ ...draft, deleteInDays: Number(event.target.value) })
                }
              >
                {deleteChoices.map((days) => (
                  <NativeSelectOption key={days} value={days}>
                    {days === 1 ? '1 day' : `${days} days`}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="send-expire">Stop working after</FieldLabel>
              <NativeSelect
                id="send-expire"
                value={draft.expireInDays === null ? '' : String(draft.expireInDays)}
                disabled={!!busy}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    expireInDays: event.target.value ? Number(event.target.value) : null,
                  })
                }
              >
                {expireChoices.map((days) => (
                  <NativeSelectOption key={days ?? 'never'} value={days ?? ''}>
                    {days === null ? 'Never' : days === 1 ? '1 day' : `${days} days`}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="send-max">Access limit</FieldLabel>
              <Input
                id="send-max"
                inputMode="numeric"
                value={draft.maxAccessCount}
                placeholder="No limit"
                disabled={!!busy}
                onChange={(event) =>
                  setDraft({ ...draft, maxAccessCount: event.target.value.replace(/\D/g, '') })
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="send-password">Password</FieldLabel>
              <Input
                id="send-password"
                type="password"
                autoComplete="new-password"
                value={draft.password}
                maxLength={1_024}
                disabled={!!busy}
                onChange={(event) => setDraft({ ...draft, password: event.target.value })}
              />
              <FieldDescription>Optional. People need it to open the Send.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="send-notes">Private notes</FieldLabel>
              <Textarea
                id="send-notes"
                value={draft.notes}
                maxLength={1_000}
                disabled={!!busy}
                onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
              />
            </Field>
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel htmlFor="send-hide-email">Hide my email address</FieldLabel>
              </FieldContent>
              <Switch
                id="send-hide-email"
                checked={draft.hideEmail}
                disabled={!!busy}
                onCheckedChange={(hideEmail) => setDraft({ ...draft, hideEmail })}
              />
            </Field>
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel htmlFor="send-disabled">Turn this Send off</FieldLabel>
              </FieldContent>
              <Switch
                id="send-disabled"
                checked={draft.disabled}
                disabled={!!busy}
                onCheckedChange={(disabled) => setDraft({ ...draft, disabled })}
              />
            </Field>
            <div className="task-actions">
              <Button type="submit" disabled={!canCreate} aria-busy={busy === 'create'}>
                {busy === 'create' ? <Spinner /> : null}
                {draft.type === 'file' ? 'Choose file and create' : 'Create Send'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={!!busy}
                onClick={() => {
                  setCreating(false);
                  setDraft(emptyDraft);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
        {message && (
          <p role="status" className="text-xs text-muted-foreground">
            {message}
          </p>
        )}
        {sends === null && !message && <Spinner />}
        {sends?.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No Sends yet. Use New Send to share text or a file.
          </p>
        )}
        {sends?.map((send, index) => (
          <div key={send.id}>
            {index > 0 && <Separator />}
            <div className="task-credential">
              <div>
                <span className="field-value text-sm">{send.name}</span>
                <p className="text-xs text-muted-foreground">{describe(send)}</p>
              </div>
              <div className="task-actions">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Copy link for ${send.name}`}
                  disabled={!!busy}
                  onClick={() => void copyLink(send)}
                >
                  <LinkSimple />
                </Button>
                {send.passwordSet && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={!!busy}
                    onClick={() => void removePassword(send)}
                  >
                    Remove password
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Delete ${send.name}`}
                  disabled={!!busy}
                  onClick={() => void remove(send)}
                >
                  <Trash />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
