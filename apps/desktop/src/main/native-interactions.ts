import { basename, join } from 'node:path';
import { app, dialog, Menu, type BrowserWindow, type MenuItemConstructorOptions } from 'electron';
import type {
  ItemDetail,
  ItemMenuAction,
  MenuPosition,
  NativeConfirmation,
} from '@strongroom/shared/types';

export function installNativeInteractions(window: BrowserWindow) {
  let confirmation: AbortController | undefined;
  let dismissMenu: (() => void) | undefined;
  const cancelMenu = () => dismissMenu?.();
  window.webContents.on('context-menu', (_event, params) => {
    if (!params.isEditable && !params.selectionText) return;
    const { editFlags } = params;
    const secret = params.formControlType === 'input-password';
    const template: MenuItemConstructorOptions[] = params.isEditable
      ? [
          { role: 'undo', enabled: editFlags.canUndo },
          { role: 'redo', enabled: editFlags.canRedo },
          { type: 'separator' },
          { role: 'cut', enabled: !secret && editFlags.canCut },
          { role: 'copy', enabled: !secret && editFlags.canCopy },
          { role: 'paste', enabled: editFlags.canPaste },
          { type: 'separator' },
          { role: 'selectAll', enabled: editFlags.canSelectAll },
        ]
      : [{ role: 'copy', enabled: editFlags.canCopy }];
    cancelMenu();
    const menu = Menu.buildFromTemplate(template);
    const dismiss = () => {
      if (dismissMenu === dismiss) dismissMenu = undefined;
      if (!window.isDestroyed()) menu.closePopup(window);
    };
    dismissMenu = dismiss;
    menu.popup({
      window,
      frame: params.frame ?? undefined,
      callback: () => {
        if (dismissMenu === dismiss) dismissMenu = undefined;
      },
    });
  });
  const cancelConfirmation = () => confirmation?.abort();
  window.on('hide', cancelConfirmation);
  window.once('closed', cancelConfirmation);
  window.on('hide', cancelMenu);
  window.once('closed', cancelMenu);
  window.webContents.on('did-start-navigation', cancelMenu);
  return {
    cancelConfirmation,
    cancelMenu,
    itemMenu(item: ItemDetail, position: MenuPosition): Promise<ItemMenuAction | null> {
      cancelMenu();
      if (confirmation || window.isDestroyed() || !window.isVisible()) return Promise.resolve(null);
      return new Promise((resolve) => {
        let action: ItemMenuAction | null = null;
        const entry = (
          label: string,
          value: ItemMenuAction,
          enabled = true,
        ): MenuItemConstructorOptions => ({
          label,
          enabled,
          click: () => {
            action = value;
          },
        });
        const template: MenuItemConstructorOptions[] = [];
        if (item.type === 1) {
          template.push(entry('Copy Username', 'copyUsername', !!item.username));
          template.push(entry('Copy Password', 'copyPassword', !!item.password));
          template.push({ type: 'separator' });
        }
        template.push(entry('Edit', 'edit', item.editable));
        if (item.restorable) template.push(entry('Restore to Vault', 'restore'));
        else template.push(entry('Move to Trash…', 'trash', item.deletable));
        const menu = Menu.buildFromTemplate(template);
        const dismiss = () => {
          if (dismissMenu === dismiss) dismissMenu = undefined;
          resolve(null);
          if (!window.isDestroyed()) menu.closePopup(window);
        };
        dismissMenu = dismiss;
        const [width = 1, height = 1] = window.getContentSize();
        menu.popup({
          window,
          x: Math.min(position.x, width - 1),
          y: Math.min(position.y, height - 1),
          callback: () => {
            if (dismissMenu === dismiss) dismissMenu = undefined;
            resolve(action);
          },
        });
      });
    },
    /** Asks where to save a download. Returns null when the user cancels. */
    async chooseSavePath(suggestedName: string): Promise<string | null> {
      if (window.isDestroyed() || !window.isVisible()) return null;
      const result = await dialog.showSaveDialog(window, {
        defaultPath: join(app.getPath('downloads'), basename(suggestedName) || 'attachment'),
      });
      return result.canceled || !result.filePath ? null : result.filePath;
    },
    /** Asks which file to attach. Returns null when the user cancels. */
    async chooseOpenPath(): Promise<string | null> {
      if (window.isDestroyed() || !window.isVisible()) return null;
      const result = await dialog.showOpenDialog(window, { properties: ['openFile'] });
      return result.canceled || !result.filePaths[0] ? null : result.filePaths[0];
    },
    async confirm(action: NativeConfirmation) {
      if (confirmation || window.isDestroyed() || !window.isVisible()) return false;
      const controller = new AbortController();
      confirmation = controller;
      try {
        const copy = {
          discard: {
            message: 'Discard changes?',
            detail: 'Your unsaved changes will be lost.',
            buttons: ['Keep editing', 'Discard changes'],
          },
          trash: {
            message: 'Move this item to Trash?',
            detail: 'You can restore it from Trash. This does not delete it permanently.',
            buttons: ['Cancel', 'Move to Trash'],
          },
          deleteFolder: {
            message: 'Delete this folder?',
            detail: 'Items in this folder move to No folder. They are not deleted.',
            buttons: ['Cancel', 'Delete folder'],
          },
          deleteAttachment: {
            message: 'Delete this attachment?',
            detail: 'The file is removed from this item. This cannot be undone.',
            buttons: ['Cancel', 'Delete attachment'],
          },
          deleteSend: {
            message: 'Delete this Send?',
            detail: 'The link stops working right away. This cannot be undone.',
            buttons: ['Cancel', 'Delete Send'],
          },
          exportPlain: {
            message: 'Export without encryption?',
            detail:
              'The file will hold every password and note in your vault as plain text. Anyone who can open it can read them. Keep it safe and delete it when you are done.',
            buttons: ['Cancel', 'Export anyway'],
          },
        }[action];
        const result = await dialog.showMessageBox(window, {
          type: 'warning',
          ...copy,
          defaultId: 0,
          cancelId: 0,
          noLink: true,
          signal: controller.signal,
        });
        return !controller.signal.aborted && result.response === 1;
      } finally {
        confirmation = undefined;
      }
    },
  };
}
