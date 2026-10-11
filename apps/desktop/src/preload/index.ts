import { contextBridge, ipcRenderer } from 'electron';
import type {
  StrongroomApi,
  VaultState,
  WindowCommand,
  WindowAppearance,
} from '@strongroom/shared/types';
import type { DesktopRequest } from '@strongroom/shared/protocol';

const request = (message: DesktopRequest) => ipcRenderer.invoke('strongroom:request', message);

const api: StrongroomApi = {
  lockTimeout: () => request({ type: 'lockTimeout' }),
  setLockTimeout: (minutes) => request({ type: 'setLockTimeout', minutes }),
  macAutoFill: () => request({ type: 'macAutoFill' }),
  enableMacAutoFill: () => request({ type: 'enableMacAutoFill' }),
  macAutoFillSettings: () => request({ type: 'macAutoFillSettings' }),
  websiteIcons: () => request({ type: 'websiteIcons' }),
  setWebsiteIcons: (enabled) => request({ type: 'setWebsiteIcons', enabled }),
  websiteIcon: (id) => request({ type: 'websiteIcon', id }),
  confirm: (action) => request({ type: 'confirm', action }),
  itemMenu: (id, position) => request({ type: 'itemMenu', id, position }),
  state: () => request({ type: 'state' }),
  login: (input) => request({ type: 'login', input }),
  answerChallenge: (answer) => request({ type: 'challenge', answer }),
  unlock: (password) => request({ type: 'unlock', password }),
  unlockWithBiometrics: () => request({ type: 'biometricUnlock' }),
  setBiometrics: (enabled) => request({ type: 'setBiometrics', enabled }),
  lock: () => request({ type: 'lock' }),
  logout: () => request({ type: 'logout' }),
  sync: () => request({ type: 'sync' }),
  items: () => request({ type: 'items' }),
  trash: () => request({ type: 'trash' }),
  folders: () => request({ type: 'folders' }),
  createFolder: (name) => request({ type: 'createFolder', name }),
  renameFolder: (id, name) => request({ type: 'renameFolder', id, name }),
  deleteFolder: (id) => request({ type: 'deleteFolder', id }),
  detail: (id) => request({ type: 'detail', id }),
  totp: (id) => request({ type: 'totp', id }),
  health: (breaches) => request({ type: 'health', breaches }),
  save: (draft) => request({ type: 'save', draft }),
  setFavorite: (id, favorite) => request({ type: 'setFavorite', id, favorite }),
  remove: (id) => request({ type: 'delete', id }),
  restore: (id) => request({ type: 'restore', id }),
  copy: (id, field) => request({ type: 'copy', id, field }),
  copyExtra: (id, index) => request({ type: 'copyExtra', id, index }),
  copyCustomField: (id, index) => request({ type: 'copyCustomField', id, index }),
  copyHistory: (id, index) => request({ type: 'copyHistory', id, index }),
  downloadAttachment: (id, attachmentId) =>
    request({ type: 'downloadAttachment', id, attachmentId }),
  deleteAttachment: (id, attachmentId) => request({ type: 'deleteAttachment', id, attachmentId }),
  addAttachment: (id) => request({ type: 'addAttachment', id }),
  generate: (options) => request({ type: 'generate', options }),
  sends: () => request({ type: 'sends' }),
  createSend: (draft) => request({ type: 'createSend', draft }),
  deleteSend: (id) => request({ type: 'deleteSend', id }),
  removeSendPassword: (id) => request({ type: 'removeSendPassword', id }),
  copySendLink: (id) => request({ type: 'copySendLink', id }),
  exportVault: (format) => request({ type: 'exportVault', format }),
  importVault: (format) => request({ type: 'importVault', format }),
  browserSetup: () => request({ type: 'browserSetup' }),
  connectBrowser: (browser) => request({ type: 'connectBrowser', browser }),
  browserConnection: () => request({ type: 'browserConnection' }),
  openExtensionFolder: () => request({ type: 'openExtensionFolder' }),
  onState: (listener) => {
    const handler = (_event: Electron.IpcRendererEvent, state: VaultState) => listener(state);
    ipcRenderer.on('strongroom:state', handler);
    return () => ipcRenderer.removeListener('strongroom:state', handler);
  },
  appearance: () => request({ type: 'appearance' }),
  onAppearance: (listener) => {
    const handler = (_event: Electron.IpcRendererEvent, value: WindowAppearance) => listener(value);
    ipcRenderer.on('strongroom:appearance', handler);
    return () => ipcRenderer.removeListener('strongroom:appearance', handler);
  },
  onCommand: (listener) => {
    const handler = (_event: Electron.IpcRendererEvent, command: WindowCommand) => {
      if (command === 'search' || command === 'new' || command === 'settings') listener(command);
    };
    ipcRenderer.on('strongroom:command', handler);
    return () => ipcRenderer.removeListener('strongroom:command', handler);
  },
};

contextBridge.exposeInMainWorld('strongroom', api);
