import { showHUD, showToast, Toast } from '@raycast/api';
import { request } from './bridge';
export default async function LockVault() {
  try {
    await request({ type: 'lock' });
    await showHUD('Strongroom locked');
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: 'Could not lock Strongroom',
      message: 'Open Strongroom and try again.',
    });
  }
}
