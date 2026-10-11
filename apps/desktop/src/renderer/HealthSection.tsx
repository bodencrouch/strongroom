import { useState } from 'react';
import { WarningCircle as CircleAlert } from '@phosphor-icons/react';
import type { HealthSummary } from '@strongroom/shared/types';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { Field, FieldContent, FieldDescription, FieldLabel } from '@/components/ui/field';

/** On-demand report on reused, weak and unencrypted logins, with an opt-in leak lookup. */
export function HealthSection() {
  const [breaches, setBreaches] = useState(false);
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<HealthSummary | null>(null);
  const [error, setError] = useState('');

  async function run() {
    if (running) return;
    setRunning(true);
    setError('');
    try {
      const result = await window.strongroom.health(breaches);
      if (result.ok) setSummary(result.value);
      else setError(result.error);
    } catch {
      setError('Could not check your vault. Try again.');
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="task-settings-section">
      <h3>Check your logins</h3>
      <div className="settings-group">
        <Field orientation="horizontal" className="setting-row settings-row">
          <FieldContent>
            <FieldLabel htmlFor="settings-health-breaches">Look for leaked passwords</FieldLabel>
            <FieldDescription id="health-breaches-description">
              Sends only the first 5 characters of each password’s hash to a public breach service.
              Passwords never leave this computer.
            </FieldDescription>
          </FieldContent>
          <Switch
            id="settings-health-breaches"
            checked={breaches}
            onCheckedChange={setBreaches}
            disabled={running}
            aria-describedby="health-breaches-description"
          />
        </Field>
        <div className="settings-row">
          <Button type="button" onClick={() => void run()} disabled={running} aria-busy={running}>
            {running ? <Spinner /> : null}
            {running ? 'Checking' : 'Check vault'}
          </Button>
        </div>
      </div>
      {error && (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {summary && (
        <div className="settings-group" aria-live="polite">
          <div className="settings-row">
            <div>
              <strong>Checked {summary.checked.toLocaleString()} logins</strong>
            </div>
          </div>
          <ReportRow
            title="Reused passwords"
            lines={summary.reused.map((group) => group.names.join(', '))}
          />
          <ReportRow
            title="Weak passwords"
            lines={summary.weak.map((row) => `${row.name} (${row.reasons.join(', ')})`)}
          />
          <ReportRow title="Sites without encryption" lines={summary.insecure.map((r) => r.name)} />
          {summary.exposed && (
            <ReportRow
              title="Found in known leaks"
              lines={summary.exposed.map((row) => `${row.name} (seen ${row.count} times)`)}
            />
          )}
        </div>
      )}
    </section>
  );
}

function ReportRow({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="settings-row">
      <div>
        <strong>
          {title}: {lines.length}
        </strong>
        {lines.slice(0, 50).map((line, index) => (
          <p key={`${index}-${line}`}>{line}</p>
        ))}
        {lines.length > 50 && <p>And {lines.length - 50} more.</p>}
      </div>
    </div>
  );
}
