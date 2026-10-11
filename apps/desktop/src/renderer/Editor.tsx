import { useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { Check, Eye, EyeSlash as EyeOff, X } from '@phosphor-icons/react';
import {
  cardBrands,
  cardMonths,
  type Folder,
  type FieldDraft,
  type ItemDetail,
  type ItemDraft,
  type UriDraft,
} from '@strongroom/shared/types';
import {
  emptyCard,
  emptyIdentity,
  emptySshKey,
  itemDraft,
  uriMatchOptions,
} from '@strongroom/shared/item-drafts';
import { uriMatchSchema } from '@strongroom/shared/protocol';
import type { Notifier } from './Toasts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
  InputGroupButton,
} from '@/components/ui/input-group';
import { Textarea } from '@/components/ui/textarea';
import { Field, FieldGroup, FieldLabel, FieldError } from '@/components/ui/field';
import { Switch } from '@/components/ui/switch';
import { Spinner } from '@/components/ui/spinner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { PasswordGenerator } from './PasswordGenerator';
import './tasks.css';

type ItemType = ItemDraft['type'];
const typeLabels: Record<ItemType, string> = {
  1: 'login',
  2: 'secure note',
  3: 'card',
  4: 'identity',
  5: 'SSH key',
};
const fieldTypeLabels = { 0: 'Text', 1: 'Hidden', 2: 'Boolean' } as const;

function blankDraft(
  type: ItemType,
  base: Pick<ItemDraft, 'name' | 'notes' | 'favorite' | 'folderId' | 'fields'>,
): ItemDraft {
  switch (type) {
    case 1:
      return { ...base, type, username: '', password: '', uris: [] };
    case 2:
      return { ...base, type };
    case 3:
      return { ...base, type, ...emptyCard };
    case 4:
      return { ...base, type, ...emptyIdentity };
    case 5:
      return { ...base, type, ...emptySshKey };
  }
}

/** A text input for a value that is hidden until the user reveals it. */
function SecretInput({
  id,
  label,
  value,
  onChange,
  disabled,
  readOnly,
  multiline,
  autoComplete = 'off',
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  readOnly?: boolean;
  multiline?: boolean;
  autoComplete?: string;
}) {
  const [shown, setShown] = useState(false);
  const toggle = (
    <InputGroupAddon align="inline-end">
      <InputGroupButton
        size="icon-sm"
        aria-label={`${shown ? 'Hide' : 'Reveal'} ${label.toLowerCase()}`}
        aria-pressed={shown}
        onClick={() => setShown(!shown)}
        disabled={disabled}
      >
        {shown ? <EyeOff /> : <Eye />}
      </InputGroupButton>
    </InputGroupAddon>
  );
  return (
    <InputGroup>
      {multiline ? (
        <Textarea
          id={id}
          className="task-notes"
          data-masked={!shown}
          rows={4}
          spellCheck={false}
          value={value}
          readOnly={readOnly}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
        />
      ) : (
        <InputGroupInput
          id={id}
          type={shown ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          readOnly={readOnly}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
        />
      )}
      {toggle}
    </InputGroup>
  );
}

export function Editor({
  item,
  folders,
  defaultFolderId,
  defaultType,
  onClose,
  onSaved,
  notify,
}: {
  item: ItemDetail | null;
  folders: Folder[];
  /** The folder a new item starts in. */
  defaultFolderId: string | null;
  /** The type a new item starts as. */
  defaultType: 1 | 2;
  onClose: () => void;
  onSaved: (item: ItemDetail) => void;
  notify: Notifier;
}) {
  const [initial] = useState<ItemDraft>(() =>
    item
      ? itemDraft(item)
      : blankDraft(defaultType, {
          name: '',
          notes: '',
          favorite: false,
          folderId: defaultFolderId,
          fields: [],
        }),
  );
  const [draft, setDraft] = useState(initial);
  const isNote = draft.type === 2;
  const editing = Boolean(item);
  const [busy, setBusy] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState('');
  const [discarding, setDiscarding] = useState(false);
  const [active, setActive] = useState(true);
  const alive = useRef(false);
  const epoch = useRef(0);
  const operation = useRef(false);
  const returnFocus = useRef(document.activeElement);
  const nameInput = useRef<HTMLInputElement>(null);
  useLayoutEffect(() => {
    alive.current = true;
    const unsubscribe = window.strongroom.onState((state) => {
      if (state.status !== 'unlocked') {
        alive.current = false;
        epoch.current++;
        setActive(false);
      }
    });
    return () => {
      alive.current = false;
      epoch.current++;
      unsubscribe();
    };
  }, []);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  async function close() {
    if (operation.current || !alive.current) return;
    if (!dirty) {
      onClose();
      return;
    }
    operation.current = true;
    setDiscarding(true);
    const request = ++epoch.current;
    try {
      const result = await window.strongroom.confirm('discard');
      if (!alive.current || request !== epoch.current) return;
      if (!result.ok) setError(result.error);
      else if (result.value) onClose();
    } catch {
      if (alive.current && request === epoch.current)
        setError('Could not show confirmation. Try again.');
    } finally {
      if (alive.current && request === epoch.current) {
        operation.current = false;
        setDiscarding(false);
      }
    }
  }
  function update(key: 'name' | 'notes', value: string): void;
  function update(key: 'favorite', value: boolean): void;
  function update(key: 'name' | 'notes' | 'favorite', value: string | boolean) {
    setDraft((current) =>
      key === 'favorite' && typeof value === 'boolean'
        ? { ...current, favorite: value }
        : key !== 'favorite' && typeof value === 'string'
          ? { ...current, [key]: value }
          : current,
    );
  }
  function loginField(key: 'username' | 'password', value: string) {
    setDraft((current) => (current.type === 1 ? { ...current, [key]: value } : current));
  }
  function bodyField(key: string, value: string) {
    setDraft((current) => ({ ...current, [key]: value }) as ItemDraft);
  }
  function fieldRows(change: (rows: FieldDraft[]) => FieldDraft[]) {
    setDraft((current) => ({ ...current, fields: change(current.fields ?? []) }));
  }
  function textField(key: string, label: string, props: { maxLength?: number } = {}) {
    const id = `editor-${key}`;
    return (
      <Field key={key}>
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <Input
          id={id}
          value={(draft as unknown as Record<string, string>)[key] ?? ''}
          onChange={(event) => bodyField(key, event.target.value)}
          autoComplete="off"
          maxLength={props.maxLength ?? 500}
          disabled={busy}
        />
      </Field>
    );
  }
  function secretField(key: string, label: string, props: { maxLength?: number } = {}) {
    const id = `editor-${key}`;
    return (
      <Field key={key}>
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <SecretInput
          id={id}
          label={label}
          value={(draft as unknown as Record<string, string>)[key] ?? ''}
          onChange={(value) => bodyField(key, value.slice(0, props.maxLength ?? 500))}
          disabled={busy}
        />
      </Field>
    );
  }
  function uriRows(change: (rows: UriDraft[]) => UriDraft[]) {
    setDraft((current) =>
      current.type === 1 ? { ...current, uris: change(current.uris) } : current,
    );
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (operation.current || !alive.current) return;
    operation.current = true;
    const request = ++epoch.current;
    setBusy(true);
    setError('');
    const pending = notify.show('pending', 'Saving…');
    try {
      const response = await window.strongroom.save(draft);
      if (!alive.current || request !== epoch.current) return;
      if (response.ok) {
        notify.settle(pending, 'done', 'Saved to Bitwarden');
        onSaved(response.value);
      } else {
        notify.settle(pending, 'error', 'Could not save.');
        setError(response.error);
      }
    } catch {
      if (alive.current && request === epoch.current) {
        notify.settle(pending, 'error', 'Could not save.');
        setError('Could not save. Try again.');
      }
    } finally {
      if (alive.current && request === epoch.current) {
        operation.current = false;
        setBusy(false);
      }
    }
  }
  if (!active) return null;
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) void close();
      }}
    >
      <DialogContent
        className="task-dialog"
        showCloseButton={false}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          nameInput.current?.focus();
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          const target = returnFocus.current;
          if (
            target instanceof HTMLElement &&
            target !== document.body &&
            target.isConnected &&
            target.getClientRects().length
          )
            target.focus();
          else
            document
              .querySelector<HTMLElement>('#auth-password, [aria-label="Search vault"]')
              ?.focus();
        }}
        onEscapeKeyDown={(event) => {
          event.preventDefault();
          if (!discarding) void close();
        }}
      >
        <DialogHeader className="task-header">
          <DialogTitle>
            {item ? 'Edit' : 'New'} {typeLabels[draft.type]}
          </DialogTitle>
          <DialogDescription>Saved in your personal Bitwarden vault.</DialogDescription>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="task-close"
            aria-label="Close editor"
            onClick={close}
            disabled={busy}
          >
            <X />
          </Button>
        </DialogHeader>
        <form
          className="task-form"
          onSubmit={(event) => void save(event)}
          aria-busy={busy}
          aria-describedby={error ? 'editor-error' : undefined}
        >
          <div className="task-body">
            <FieldGroup>
              {!item && (
                <Field>
                  <FieldLabel htmlFor="editor-type">Item type</FieldLabel>
                  <select
                    id="editor-type"
                    value={draft.type}
                    disabled={busy}
                    onChange={(event) => {
                      const type = Number(event.target.value) as ItemType;
                      if (type === draft.type) return;
                      setDraft(
                        blankDraft(type, {
                          name: draft.name,
                          notes: draft.notes,
                          favorite: draft.favorite,
                          folderId: draft.folderId,
                          fields: draft.fields,
                        }),
                      );
                    }}
                  >
                    <option value="1">Login</option>
                    <option value="2">Secure note</option>
                    <option value="3">Card</option>
                    <option value="4">Identity</option>
                    <option value="5">SSH key</option>
                  </select>
                </Field>
              )}
              <Field>
                <FieldLabel htmlFor="editor-name">Name</FieldLabel>
                <Input
                  ref={nameInput}
                  id="editor-name"
                  value={draft.name}
                  onChange={(event) => update('name', event.target.value)}
                  required
                  maxLength={500}
                  disabled={busy}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="editor-folder">Folder</FieldLabel>
                <select
                  id="editor-folder"
                  value={draft.folderId ?? ''}
                  disabled={busy}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, folderId: event.target.value || null }))
                  }
                >
                  <option value="">No folder</option>
                  {folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))}
                </select>
              </Field>
              {draft.type === 1 && (
                <>
                  {draft.type === 1 && (
                    <Field>
                      <FieldLabel>Websites</FieldLabel>
                      {draft.uris.map((row, index) => (
                        <div key={index} className="task-uri-row">
                          {row.action === 'keep' ? (
                            <p className="text-xs text-muted-foreground">
                              {item?.uris[row.sourceIndex]?.uri ?? 'Empty imported URI'}. Imported
                              matching rule is preserved. Edit it in Bitwarden or remove this row.
                            </p>
                          ) : (
                            <>
                              <Input
                                aria-label={`Website ${index + 1}`}
                                value={row.uri}
                                placeholder="https://example.com"
                                maxLength={2048}
                                disabled={busy}
                                onChange={(event) =>
                                  uriRows((rows) =>
                                    rows.map((entry, i) =>
                                      i === index ? { ...row, uri: event.target.value } : entry,
                                    ),
                                  )
                                }
                              />
                              <select
                                aria-label={`Match rule ${index + 1}`}
                                value={row.match === null ? '' : String(row.match)}
                                disabled={busy}
                                onChange={(event) => {
                                  const match = uriMatchSchema.parse(
                                    event.target.value === '' ? null : Number(event.target.value),
                                  );
                                  uriRows((rows) =>
                                    rows.map((entry, i) =>
                                      i === index ? { ...row, match } : entry,
                                    ),
                                  );
                                }}
                              >
                                {uriMatchOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </>
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            disabled={busy}
                            onClick={() => uriRows((rows) => rows.filter((_, i) => i !== index))}
                          >
                            Remove website
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        disabled={busy}
                        onClick={() =>
                          uriRows((rows) => [...rows, { action: 'write', uri: '', match: null }])
                        }
                      >
                        Add website
                      </Button>
                    </Field>
                  )}
                  <Field>
                    <FieldLabel htmlFor="editor-username">Username</FieldLabel>
                    <Input
                      id="editor-username"
                      value={draft.type === 1 ? draft.username : ''}
                      onChange={(event) => loginField('username', event.target.value)}
                      autoComplete="off"
                      disabled={busy}
                    />
                  </Field>
                  <Field>
                    <div className="task-label-actions">
                      <FieldLabel htmlFor="editor-password">Password</FieldLabel>
                      <PasswordGenerator
                        disabled={busy}
                        onUse={(password) => loginField('password', password)}
                      />
                    </div>
                    <InputGroup>
                      <InputGroupInput
                        id="editor-password"
                        type={revealed ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={draft.type === 1 ? draft.password : ''}
                        onChange={(event) => loginField('password', event.target.value)}
                        disabled={busy}
                      />
                      <InputGroupAddon align="inline-end">
                        <InputGroupButton
                          size="icon-sm"
                          aria-label={revealed ? 'Hide password' : 'Reveal password'}
                          aria-pressed={revealed}
                          onClick={() => setRevealed(!revealed)}
                          disabled={busy}
                        >
                          {revealed ? <EyeOff /> : <Eye />}
                        </InputGroupButton>
                      </InputGroupAddon>
                    </InputGroup>
                  </Field>
                </>
              )}
              {draft.type === 3 && (
                <>
                  {textField('cardholderName', 'Cardholder name')}
                  <Field>
                    <FieldLabel htmlFor="editor-brand">Brand</FieldLabel>
                    <select
                      id="editor-brand"
                      value={draft.brand}
                      disabled={busy}
                      onChange={(event) => bodyField('brand', event.target.value)}
                    >
                      <option value="">Select brand</option>
                      {cardBrands.map((brand) => (
                        <option key={brand} value={brand}>
                          {brand}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {secretField('number', 'Number')}
                  <Field>
                    <FieldLabel htmlFor="editor-expMonth">Expiration month</FieldLabel>
                    <select
                      id="editor-expMonth"
                      value={draft.expMonth}
                      disabled={busy}
                      onChange={(event) => bodyField('expMonth', event.target.value)}
                    >
                      <option value="">Select month</option>
                      {cardMonths.map((month) => (
                        <option key={month} value={month}>
                          {month}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="editor-expYear">Expiration year</FieldLabel>
                    <Input
                      id="editor-expYear"
                      value={draft.expYear}
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={8}
                      disabled={busy}
                      onChange={(event) => bodyField('expYear', event.target.value)}
                    />
                  </Field>
                  {secretField('code', 'Security code')}
                </>
              )}
              {draft.type === 4 && (
                <>
                  {textField('title', 'Title')}
                  {textField('firstName', 'First name')}
                  {textField('middleName', 'Middle name')}
                  {textField('lastName', 'Last name')}
                  {textField('username', 'Username')}
                  {textField('company', 'Company')}
                  {secretField('ssn', 'Social security number')}
                  {secretField('passportNumber', 'Passport number')}
                  {secretField('licenseNumber', 'License number')}
                  {textField('email', 'Email')}
                  {textField('phone', 'Phone')}
                  {textField('address1', 'Address 1')}
                  {textField('address2', 'Address 2')}
                  {textField('address3', 'Address 3')}
                  {textField('city', 'City / Town')}
                  {textField('state', 'State / Province')}
                  {textField('postalCode', 'Zip / Postal code')}
                  {textField('country', 'Country')}
                </>
              )}
              {draft.type === 5 && (
                <>
                  {editing && (
                    <p className="text-xs text-muted-foreground">
                      Keys come from elsewhere. Strongroom does not change them.
                    </p>
                  )}
                  <Field>
                    <FieldLabel htmlFor="editor-publicKey">Public key</FieldLabel>
                    <Textarea
                      id="editor-publicKey"
                      className="task-notes"
                      rows={3}
                      spellCheck={false}
                      value={draft.publicKey}
                      readOnly={editing}
                      onChange={(event) => bodyField('publicKey', event.target.value)}
                      disabled={busy}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="editor-privateKey">Private key</FieldLabel>
                    <SecretInput
                      id="editor-privateKey"
                      label="Private key"
                      multiline
                      value={draft.privateKey}
                      readOnly={editing}
                      onChange={(value) => bodyField('privateKey', value)}
                      disabled={busy}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="editor-keyFingerprint">Fingerprint</FieldLabel>
                    <Input
                      id="editor-keyFingerprint"
                      value={draft.keyFingerprint}
                      readOnly={editing}
                      autoComplete="off"
                      maxLength={500}
                      onChange={(event) => bodyField('keyFingerprint', event.target.value)}
                      disabled={busy}
                    />
                  </Field>
                </>
              )}
              <Field>
                <FieldLabel htmlFor="editor-notes">Notes</FieldLabel>
                <Textarea
                  id="editor-notes"
                  className="task-notes"
                  data-note={isNote}
                  rows={isNote ? 9 : 3}
                  value={draft.notes}
                  onChange={(event) => update('notes', event.target.value)}
                  disabled={busy}
                />
              </Field>
              <Field>
                <FieldLabel>Custom fields</FieldLabel>
                {(draft.fields ?? []).map((row, index) => (
                  <div key={index} className="task-uri-row">
                    <Input
                      aria-label={`Field name ${index + 1}`}
                      value={row.name}
                      maxLength={500}
                      autoComplete="off"
                      disabled={busy}
                      onChange={(event) =>
                        fieldRows((rows) =>
                          rows.map((entry, i) =>
                            i === index ? { ...row, name: event.target.value } : entry,
                          ),
                        )
                      }
                    />
                    <select
                      aria-label={`Field type ${index + 1}`}
                      value={row.type}
                      disabled={busy}
                      onChange={(event) => {
                        const type = Number(event.target.value) as FieldDraft['type'];
                        fieldRows((rows) =>
                          rows.map((entry, i) =>
                            i === index
                              ? {
                                  ...row,
                                  type,
                                  value:
                                    type === 2
                                      ? row.value === 'true'
                                        ? 'true'
                                        : 'false'
                                      : row.value,
                                }
                              : entry,
                          ),
                        );
                      }}
                    >
                      {([0, 1, 2] as const).map((type) => (
                        <option key={type} value={type}>
                          {fieldTypeLabels[type]}
                        </option>
                      ))}
                    </select>
                    {row.type === 2 ? (
                      <label className="text-sm">
                        <input
                          type="checkbox"
                          aria-label={`Field value ${index + 1}`}
                          checked={row.value === 'true'}
                          disabled={busy}
                          onChange={(event) =>
                            fieldRows((rows) =>
                              rows.map((entry, i) =>
                                i === index
                                  ? { ...row, value: event.target.checked ? 'true' : 'false' }
                                  : entry,
                              ),
                            )
                          }
                        />{' '}
                        Yes
                      </label>
                    ) : row.type === 1 ? (
                      <SecretInput
                        id={`editor-field-value-${index}`}
                        label={`Field value ${index + 1}`}
                        value={row.value}
                        disabled={busy}
                        onChange={(value) =>
                          fieldRows((rows) =>
                            rows.map((entry, i) => (i === index ? { ...row, value } : entry)),
                          )
                        }
                      />
                    ) : (
                      <Input
                        aria-label={`Field value ${index + 1}`}
                        value={row.value}
                        autoComplete="off"
                        disabled={busy}
                        onChange={(event) =>
                          fieldRows((rows) =>
                            rows.map((entry, i) =>
                              i === index ? { ...row, value: event.target.value } : entry,
                            ),
                          )
                        }
                      />
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      disabled={busy}
                      onClick={() => fieldRows((rows) => rows.filter((_, i) => i !== index))}
                    >
                      Remove field
                    </Button>
                  </div>
                ))}
                {item && item.customFields.length > item.fieldDrafts.length && (
                  <p className="text-xs text-muted-foreground">
                    Linked fields are kept. Edit them in Bitwarden.
                  </p>
                )}
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => fieldRows((rows) => [...rows, { name: '', value: '', type: 0 }])}
                >
                  Add field
                </Button>
              </Field>
              <Field orientation="horizontal">
                <FieldLabel id="editor-favorite-label" htmlFor="editor-favorite">
                  Favorite
                </FieldLabel>
                <Switch
                  id="editor-favorite"
                  aria-labelledby="editor-favorite-label"
                  checked={draft.favorite}
                  onCheckedChange={(value) => update('favorite', value)}
                  disabled={busy}
                />
              </Field>
              {error && <FieldError id="editor-error">{error}</FieldError>}
            </FieldGroup>
          </div>
          <DialogFooter className="task-footer">
            <Button type="button" variant="outline" onClick={close} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy} aria-busy={busy}>
              {busy ? <Spinner /> : <Check data-icon="inline-start" />}
              {busy ? 'Saving…' : `Save ${typeLabels[draft.type]}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
