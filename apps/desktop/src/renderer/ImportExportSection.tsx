import { useRef, useState } from 'react';
import { WarningCircle as CircleAlert } from '@phosphor-icons/react';
import { importFormats, type ExportFormat, type ImportFormat } from '@strongroom/shared/types';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Field, FieldContent, FieldDescription, FieldLabel } from '@/components/ui/field';

const exportChoices: [ExportFormat, string][] = [
  ['csv', '.csv (not encrypted)'],
  ['json', '.json (not encrypted)'],
  ['encrypted_json', '.json (encrypted, this account only)'],
];

/** Moves vault data in and out through the Bitwarden CLI. Files are chosen in native dialogs. */
export function ImportExportSection() {
  const [exportFormat, setExportFormat] = useState<ExportFormat>('encrypted_json');
  const [importFormat, setImportFormat] = useState<ImportFormat>('bitwardenjson');
  const [running, setRunning] = useState<'' | 'export' | 'import'>('');
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const working = useRef(false);

  async function run(kind: 'export' | 'import') {
    if (working.current) return;
    working.current = true;
    setRunning(kind);
    setError('');
    setDone('');
    try {
      if (kind === 'export') {
        const result = await window.strongroom.exportVault(exportFormat);
        if (!result.ok) setError(result.error);
        else if (result.value) setDone('Export saved.');
      } else {
        const result = await window.strongroom.importVault(importFormat);
        if (!result.ok) setError(result.error);
        else if (result.value) setDone('Import finished. Your vault is up to date.');
      }
    } catch {
      setError(
        kind === 'export'
          ? 'Could not export your vault. Try again.'
          : 'Could not import that file. Try again.',
      );
    } finally {
      working.current = false;
      setRunning('');
    }
  }

  return (
    <>
      <section className="task-settings-section">
        <h3>Export your vault</h3>
        <div className="settings-group">
          <Field className="setting-row settings-row">
            <FieldContent>
              <FieldLabel htmlFor="settings-export-format">Format</FieldLabel>
              <FieldDescription>
                Files that are not encrypted hold every password as plain text. Strongroom asks you
                to confirm first.
              </FieldDescription>
            </FieldContent>
            <NativeSelect
              id="settings-export-format"
              value={exportFormat}
              disabled={!!running}
              onChange={(event) => setExportFormat(event.target.value as ExportFormat)}
            >
              {exportChoices.map(([value, label]) => (
                <NativeSelectOption key={value} value={value}>
                  {label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <div className="settings-row">
            <Button
              type="button"
              onClick={() => void run('export')}
              disabled={!!running}
              aria-busy={running === 'export'}
            >
              {running === 'export' ? <Spinner /> : null}
              {running === 'export' ? 'Exporting' : 'Export vault'}
            </Button>
          </div>
        </div>
      </section>
      <section className="task-settings-section">
        <h3>Import into your vault</h3>
        <div className="settings-group">
          <Field className="setting-row settings-row">
            <FieldContent>
              <FieldLabel htmlFor="settings-import-format">File format</FieldLabel>
              <FieldDescription>
                Pick the app the file came from, then choose the file.
              </FieldDescription>
            </FieldContent>
            <NativeSelect
              id="settings-import-format"
              value={importFormat}
              disabled={!!running}
              onChange={(event) => setImportFormat(event.target.value as ImportFormat)}
            >
              {importFormats.map(([value, label]) => (
                <NativeSelectOption key={value} value={value}>
                  {label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <div className="settings-row">
            <Button
              type="button"
              onClick={() => void run('import')}
              disabled={!!running}
              aria-busy={running === 'import'}
            >
              {running === 'import' ? <Spinner /> : null}
              {running === 'import' ? 'Importing' : 'Choose file and import'}
            </Button>
          </div>
        </div>
      </section>
      {error && (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {done && (
        <p role="status" className="settings-caption">
          {done}
        </p>
      )}
    </>
  );
}
