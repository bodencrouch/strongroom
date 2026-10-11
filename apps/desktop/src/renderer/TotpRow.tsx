import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from '@phosphor-icons/react';
import type { TotpCode } from '@strongroom/shared/totp';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

/** Shows the current one-time code for a login. The secret itself stays in the main process. */
export function TotpRow({ itemId, disabled }: { itemId: string; disabled: boolean }) {
  const [totp, setTotp] = useState<TotpCode | null>(null);
  const [copied, setCopied] = useState(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    setTotp(null);
    setCopied(false);
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function refresh() {
      try {
        const result = await window.strongroom.totp(itemId);
        if (!alive.current) return;
        setTotp(result.ok ? result.value : null);
        // Wake just after the code rolls over, never later than a second from now.
        const wait = result.ok && result.value ? result.value.remaining * 1000 + 50 : 0;
        if (wait) timer = setTimeout(() => void refresh(), Math.min(wait, 1000));
      } catch {
        if (alive.current) setTotp(null);
      }
    }
    void refresh();
    return () => {
      alive.current = false;
      if (timer) clearTimeout(timer);
    };
  }, [itemId]);

  if (!totp) return null;
  const grouped =
    totp.code.length === 6 ? `${totp.code.slice(0, 3)} ${totp.code.slice(3)}` : totp.code;

  async function copy() {
    if (!totp) return;
    try {
      await navigator.clipboard.writeText(totp.code);
      setCopied(true);
      setTimeout(() => alive.current && setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      <Separator />
      <div className="task-credential" data-credential="totp">
        <div>
          <p id="detail-totp-label" className="text-xs text-muted-foreground">
            Verification code · {totp.remaining}s
          </p>
          <span className="field-value text-sm font-mono" aria-labelledby="detail-totp-label">
            {grouped}
          </span>
        </div>
        <div className="task-actions">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Copy verification code"
            disabled={disabled}
            onClick={() => void copy()}
          >
            {copied ? <Check /> : <Copy />}
          </Button>
        </div>
      </div>
    </>
  );
}
