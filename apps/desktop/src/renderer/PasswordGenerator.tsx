import { useEffect, useId, useMemo, useState } from 'react';
import { ArrowsClockwise, MagicWand } from '@phosphor-icons/react';
import { defaultPasswordOptions } from '@strongroom/shared/types';
import {
  defaultPassphraseOptions,
  generatePassphrase,
  generateUsername,
  type UsernameOptions,
} from '@strongroom/shared/generator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldError,
} from '@/components/ui/field';
import { Switch } from '@/components/ui/switch';
import { Spinner } from '@/components/ui/spinner';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverDescription,
  PopoverTrigger,
} from '@/components/ui/popover';

const characterTypes = [
  ['uppercase', 'Uppercase', 'A–Z'],
  ['lowercase', 'Lowercase', 'a–z'],
  ['numbers', 'Numbers', '0–9'],
  ['symbols', 'Symbols', '!@#$%&*-_=+'],
] as const;

type Mode = 'password' | 'passphrase' | 'username';
type UsernameType = UsernameOptions['type'];
const modes = [
  ['password', 'Password'],
  ['passphrase', 'Passphrase'],
  ['username', 'Username'],
] as const;

/** Password, passphrase and username generator. Usernames only show when the form can take one. */
export function PasswordGenerator({
  disabled,
  onUse,
  onUseUsername,
}: {
  disabled: boolean;
  onUse: (password: string) => void;
  onUseUsername?: (username: string) => void;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('password');
  const [options, setOptions] = useState(defaultPasswordOptions);
  const [passphrase, setPassphrase] = useState(defaultPassphraseOptions);
  const [usernameType, setUsernameType] = useState<UsernameType>('word');
  const [wordName, setWordName] = useState({ capitalize: false, includeNumber: true });
  const [email, setEmail] = useState('');
  const [domain, setDomain] = useState('');
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ value: string; key: string } | null>(null);
  const [error, setError] = useState('');
  const visibleModes = modes.filter(([key]) => key !== 'username' || onUseUsername);
  const usernameOptions: UsernameOptions =
    usernameType === 'word'
      ? { type: 'word', ...wordName }
      : usernameType === 'plusAddressed'
        ? { type: 'plusAddressed', email: email.trim() }
        : { type: 'catchAll', domain: domain.trim() };
  const key = useMemo(
    () =>
      JSON.stringify([
        mode,
        mode === 'password' ? options : mode === 'passphrase' ? passphrase : usernameOptions,
        revision,
      ]),
    // usernameOptions is rebuilt each render from the fields listed here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, options, passphrase, usernameType, wordName, email, domain, revision],
  );
  const password = result?.key === key ? result.value : '';
  const generating = open && !password && !error;
  const selectedTypes = characterTypes.filter(([name]) => options[name]).length;
  const noun = mode === 'username' ? 'username' : mode === 'passphrase' ? 'passphrase' : 'password';

  useEffect(() => {
    if (!open) {
      setResult(null);
      return;
    }
    setError('');
    if (mode !== 'password') {
      // These two run here: they only use the platform's random source.
      try {
        setResult({
          value:
            mode === 'passphrase'
              ? generatePassphrase(passphrase)
              : generateUsername(usernameOptions),
          key,
        });
      } catch (caught) {
        setResult(null);
        setError(
          caught instanceof RangeError
            ? caught.message
            : `Could not generate a ${noun}. Try again.`,
        );
      }
      return;
    }
    let active = true;
    void window.strongroom
      .generate(options)
      .then((response) => {
        if (!active) return;
        if (response.ok) setResult({ value: response.value, key });
        else setError(response.error);
      })
      .catch(() => {
        if (active) setError('Could not generate a password. Try again.');
      });
    return () => {
      active = false;
    };
    // The key stands for every option that matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, key]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" disabled={disabled}>
          <MagicWand data-icon="inline-start" /> Generate…
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="center"
        side="right"
        sideOffset={12}
        collisionPadding={16}
        className="w-80 max-h-[var(--radix-popover-content-available-height)] overflow-y-auto p-4"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`}
        onEscapeKeyDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          // The popover is inside the editor form; Enter must never save the item.
          if (event.key === 'Enter') event.stopPropagation();
        }}
      >
        <PopoverHeader>
          <PopoverTitle id={`${id}-title`}>Generator</PopoverTitle>
          <PopoverDescription id={`${id}-description`}>
            Choose what to generate and what goes into it.
          </PopoverDescription>
        </PopoverHeader>
        {visibleModes.length > 1 && (
          <div className="flex gap-1" role="group" aria-label="What to generate">
            {visibleModes.map(([name, label]) => (
              <Button
                key={name}
                type="button"
                size="sm"
                variant={mode === name ? 'secondary' : 'ghost'}
                aria-pressed={mode === name}
                onClick={() => {
                  setError('');
                  setMode(name);
                }}
              >
                {label}
              </Button>
            ))}
          </div>
        )}
        <Field>
          <FieldLabel htmlFor={`${id}-preview`}>Preview</FieldLabel>
          <div className="flex items-center gap-2">
            <Input
              id={`${id}-preview`}
              aria-busy={generating}
              readOnly
              value={password}
              placeholder={generating ? 'Generating…' : ''}
              className="min-w-0 font-mono"
              autoComplete="off"
              spellCheck={false}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Regenerate ${noun}`}
              disabled={generating}
              onClick={() => setRevision((value) => value + 1)}
            >
              {generating ? <Spinner /> : <ArrowsClockwise />}
            </Button>
          </div>
          {error && <FieldError role="alert">{error}</FieldError>}
        </Field>
        {mode === 'password' && (
          <>
            <Field>
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor={`${id}-length`}>Length</FieldLabel>
                <output htmlFor={`${id}-length`} className="text-muted-foreground tabular-nums">
                  {options.length} characters
                </output>
              </div>
              <input
                id={`${id}-length`}
                type="range"
                min={8}
                max={128}
                value={options.length}
                className="h-5 w-full accent-foreground"
                onChange={(event) => setOptions({ ...options, length: Number(event.target.value) })}
              />
            </Field>
            <div className="flex flex-col gap-3">
              {characterTypes.map(([name, label, hint]) => (
                <Field key={name} orientation="horizontal">
                  <FieldContent>
                    <FieldLabel htmlFor={`${id}-${name}`}>
                      {label}{' '}
                      <span className="font-mono font-normal text-muted-foreground">{hint}</span>
                    </FieldLabel>
                  </FieldContent>
                  <Switch
                    id={`${id}-${name}`}
                    checked={options[name]}
                    disabled={selectedTypes === 1 && options[name]}
                    onCheckedChange={(checked) => setOptions({ ...options, [name]: checked })}
                  />
                </Field>
              ))}
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldLabel htmlFor={`${id}-ambiguous`}>Easy to read</FieldLabel>
                  <FieldDescription>
                    Avoid similar characters like I, l, 1, O and 0.
                  </FieldDescription>
                </FieldContent>
                <Switch
                  id={`${id}-ambiguous`}
                  checked={options.excludeAmbiguous}
                  onCheckedChange={(checked) =>
                    setOptions({ ...options, excludeAmbiguous: checked })
                  }
                />
              </Field>
            </div>
          </>
        )}
        {mode === 'passphrase' && (
          <>
            <Field>
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor={`${id}-words`}>Words</FieldLabel>
                <output htmlFor={`${id}-words`} className="text-muted-foreground tabular-nums">
                  {passphrase.words} words
                </output>
              </div>
              <input
                id={`${id}-words`}
                type="range"
                min={3}
                max={20}
                value={passphrase.words}
                className="h-5 w-full accent-foreground"
                onChange={(event) =>
                  setPassphrase({ ...passphrase, words: Number(event.target.value) })
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${id}-separator`}>Separator</FieldLabel>
              <Input
                id={`${id}-separator`}
                value={passphrase.separator}
                maxLength={1}
                className="font-mono"
                autoComplete="off"
                spellCheck={false}
                onChange={(event) =>
                  setPassphrase({ ...passphrase, separator: event.target.value })
                }
              />
            </Field>
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel htmlFor={`${id}-capitalize`}>Capitalize</FieldLabel>
              </FieldContent>
              <Switch
                id={`${id}-capitalize`}
                checked={passphrase.capitalize}
                onCheckedChange={(checked) => setPassphrase({ ...passphrase, capitalize: checked })}
              />
            </Field>
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel htmlFor={`${id}-number`}>Include a number</FieldLabel>
              </FieldContent>
              <Switch
                id={`${id}-number`}
                checked={passphrase.includeNumber}
                onCheckedChange={(checked) =>
                  setPassphrase({ ...passphrase, includeNumber: checked })
                }
              />
            </Field>
          </>
        )}
        {mode === 'username' && (
          <>
            <Field>
              <FieldLabel htmlFor={`${id}-username-type`}>Type</FieldLabel>
              <NativeSelect
                id={`${id}-username-type`}
                value={usernameType}
                onChange={(event) => setUsernameType(event.target.value as UsernameType)}
              >
                <NativeSelectOption value="word">Random word</NativeSelectOption>
                <NativeSelectOption value="plusAddressed">Plus-addressed email</NativeSelectOption>
                <NativeSelectOption value="catchAll">Catch-all email</NativeSelectOption>
              </NativeSelect>
            </Field>
            {usernameType === 'word' && (
              <>
                <Field orientation="horizontal">
                  <FieldContent>
                    <FieldLabel htmlFor={`${id}-user-capitalize`}>Capitalize</FieldLabel>
                  </FieldContent>
                  <Switch
                    id={`${id}-user-capitalize`}
                    checked={wordName.capitalize}
                    onCheckedChange={(checked) => setWordName({ ...wordName, capitalize: checked })}
                  />
                </Field>
                <Field orientation="horizontal">
                  <FieldContent>
                    <FieldLabel htmlFor={`${id}-user-number`}>Include a number</FieldLabel>
                  </FieldContent>
                  <Switch
                    id={`${id}-user-number`}
                    checked={wordName.includeNumber}
                    onCheckedChange={(checked) =>
                      setWordName({ ...wordName, includeNumber: checked })
                    }
                  />
                </Field>
              </>
            )}
            {usernameType === 'plusAddressed' && (
              <Field>
                <FieldLabel htmlFor={`${id}-email`}>Your email address</FieldLabel>
                <Input
                  id={`${id}-email`}
                  type="email"
                  value={email}
                  placeholder="you@example.com"
                  autoComplete="off"
                  spellCheck={false}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </Field>
            )}
            {usernameType === 'catchAll' && (
              <Field>
                <FieldLabel htmlFor={`${id}-domain`}>Your domain</FieldLabel>
                <Input
                  id={`${id}-domain`}
                  value={domain}
                  placeholder="example.com"
                  autoComplete="off"
                  spellCheck={false}
                  onChange={(event) => setDomain(event.target.value)}
                />
              </Field>
            )}
          </>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!password || disabled}
            onClick={() => {
              if (mode === 'username') onUseUsername?.(password);
              else onUse(password);
              setOpen(false);
            }}
          >
            Use {noun}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
