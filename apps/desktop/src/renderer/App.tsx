import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import {
  WarningCircle as AlertCircle,
  FileText,
  Fingerprint,
  FolderSimple,
  PencilSimple,
  Vault as FolderKey,
  Key as KeyRound,
  LockKey as LockKeyhole,
  Plus,
  ArrowsClockwise as RefreshCw,
  MagnifyingGlass as Search,
  SlidersHorizontal as Settings2,
  Star,
  Trash as Trash2,
  X,
} from '@phosphor-icons/react';
import type { Folder, ItemDetail, ItemSummary, MenuPosition, VaultState } from '@strongroom/shared/types';
import { Auth } from './Auth';
import { Editor } from './Editor';
import { Settings } from './Settings';
import { Mark } from './Mark';
import { Detail } from './Detail';
import { ItemList } from './ItemList';
import { QuickOpen } from './QuickOpen';
import { WebsiteIconsProvider } from './WebsiteIcons';
import { Toasts, useToasts, type Notifier } from './Toasts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import { Kbd } from '@/components/ui/kbd';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import './workspace.css';
import { useWindowAppearance } from './useWindowAppearance';

const initialState: VaultState = {
  revision: -1,
  itemsRevision: 0,
  trashLoaded: false,
  status: 'signed-out',
  email: '',
  server: 'https://vault.bitwarden.com',
  lastSync: null,
  itemCount: 0,
  trashCount: 0,
  biometrics: 'unsupported',
  biometricsOn: false,
};
type Filter =
  | 'all'
  | 'favorites'
  | 'logins'
  | 'notes'
  | 'passkeys'
  | 'trash'
  | 'nofolder'
  | `folder:${string}`;
type FolderEdit = { mode: 'create' } | { mode: 'rename'; folder: Folder } | null;
type Selection =
  | { status: 'unselected' }
  | { status: 'loading' | 'restricted' | 'error'; id: string }
  | { status: 'ready'; item: ItemDetail };
type Modal = 'new' | 'edit' | 'settings' | 'search' | null;
const filters = [
  { id: 'all', label: 'All items', icon: FolderKey, empty: undefined, description: undefined },
  {
    id: 'favorites',
    label: 'Favorites',
    icon: Star,
    empty: 'No favorites',
    description: 'Mark an item as a favorite to find it here.',
  },
  {
    id: 'logins',
    label: 'Logins',
    icon: KeyRound,
    empty: 'No logins',
    description: 'Use New login to add one.',
  },
  {
    id: 'notes',
    label: 'Secure notes',
    icon: FileText,
    empty: 'No secure notes',
    description: 'Secure notes from Bitwarden appear here.',
  },
  {
    id: 'passkeys',
    label: 'Passkeys',
    icon: Fingerprint,
    empty: 'No saved passkeys',
    description: 'Passkeys sign in through macOS AutoFill. Edit them in Bitwarden.',
  },
  {
    id: 'trash',
    label: 'Trash',
    icon: Trash2,
    empty: 'Trash is empty',
    description: 'Items moved to Trash can be restored.',
  },
] as const;

function indexItems(items: ItemSummary[]) {
  return items.map((item) => ({
    item,
    haystack: `${item.name} ${item.username} ${item.website}`.toLowerCase(),
  }));
}

/** Include task-owned and portalled dialogs, not only App's modal state. */
function hasModal() {
  return !!document.querySelector(
    '[role="dialog"]:not([data-state="closed"]), [role="alertdialog"]:not([data-state="closed"])',
  );
}

export function App() {
  useWindowAppearance();
  const [state, setState] = useState(initialState);
  const [ready, setReady] = useState(false);
  const stateRef = useRef(state);
  const stateVersion = useRef(0);
  const locking = useRef(false);
  const receiveState = useCallback((next: VaultState) => {
    if (locking.current && next.status === 'unlocked') return;
    if (next.revision < stateRef.current.revision) return;
    stateVersion.current++;
    stateRef.current = next;
    // External lock events must remove the entire workspace and its portals
    // before returning to the event loop, without an exit-animation interval.
    flushSync(() => {
      setState(next);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    let active = true;
    const unsubscribe = window.strongroom.onState(receiveState);
    const version = stateVersion.current;
    void window.strongroom
      .state()
      .then((response) => {
        if (!active || version !== stateVersion.current) return;
        receiveState(
          response.ok
            ? response.value
            : {
                ...initialState,
                setupError: 'Could not connect to Strongroom. Reopen the app to try again.',
              },
        );
      })
      .catch(() => {
        if (active && version === stateVersion.current)
          receiveState({
            ...initialState,
            setupError: 'Could not connect to Strongroom. Reopen the app to try again.',
          });
      });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [receiveState]);

  const lock = useCallback(() => {
    if (stateRef.current.status !== 'unlocked' || locking.current) return;
    locking.current = true;
    receiveState({ ...stateRef.current, status: 'locked', itemCount: 0, trashCount: 0 });
    void window.strongroom
      .lock()
      .then((response) => {
        if (response.ok && response.value.status !== 'unlocked') receiveState(response.value);
      })
      .catch(() => {
        // Keep the renderer locked if the bridge fails. Never restore old data.
      })
      .finally(() => {
        locking.current = false;
      });
  }, [receiveState]);

  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'l') {
        event.preventDefault();
        event.stopImmediatePropagation();
        lock();
      }
    };
    addEventListener('keydown', keyboard, true);
    return () => removeEventListener('keydown', keyboard, true);
  }, [lock]);

  if (!ready)
    return (
      <div className="boot" role="status">
        <Mark size={30} />
        <span>Strongroom</span>
      </div>
    );
  if (state.status !== 'unlocked')
    return <Auth key={state.status + state.email} state={state} onState={receiveState} />;
  // All vault state, virtualizers, task portals and notifications have exactly
  // this lifetime. A later unlock mounts a fresh workspace and fresh guards.
  return (
    <WebsiteIconsProvider>
      <VaultWorkspace state={state} onState={receiveState} />
    </WebsiteIconsProvider>
  );
}

function VaultWorkspace({
  state,
  onState,
}: {
  state: VaultState;
  onState: (state: VaultState) => void;
}) {
  const [items, setItems] = useState<ItemSummary[]>([]);
  const [trashed, setTrashed] = useState<ItemSummary[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [foldersLoaded, setFoldersLoaded] = useState(false);
  const [folderEdit, setFolderEdit] = useState<FolderEdit>(null);
  const [folderBusy, setFolderBusy] = useState(false);
  const folderWorking = useRef(false);
  const folderVersion = useRef(0);
  const [selection, setSelection] = useState<Selection>({ status: 'unselected' });
  const selected = selection.status === 'ready' ? selection.item : null;
  const selectedId =
    selection.status === 'ready'
      ? selection.item.id
      : selection.status === 'unselected'
        ? ''
        : selection.id;
  const [revealSelection, setRevealSelection] = useState(0);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [modal, setModal] = useState<Modal>(null);
  const settings = modal === 'settings';
  const [syncing, setSyncing] = useState(false);
  const [favoritePending, setFavoritePending] = useState('');
  const favoriteWorking = useRef(false);
  const [loading, setLoading] = useState(true);
  const [trashLoading, setTrashLoading] = useState(false);
  const [listError, setListError] = useState({ all: '', trash: '' });
  const alive = useRef(true);
  const selectionVersion = useRef(0);
  const listVersion = useRef(0);
  const searchInput = useRef<HTMLInputElement>(null);
  const newButton = useRef<HTMLButtonElement>(null);
  const settingsButton = useRef<HTMLButtonElement>(null);
  const { show, settle } = useToasts();
  const notify = useMemo<Notifier>(
    () => ({
      show: (kind, message) => (alive.current ? show(kind, message) : -1),
      settle: (id, kind, message) => {
        if (alive.current) settle(id, kind, message);
      },
    }),
    [show, settle],
  );

  useLayoutEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      selectionVersion.current++;
      listVersion.current++;
    };
  }, []);

  useEffect(() => {
    const version = ++listVersion.current;
    void window.strongroom
      .items()
      .then((listed) => {
        if (!alive.current || version !== listVersion.current) return;
        if (listed.ok) setItems(listed.value);
        setListError((current) => ({
          ...current,
          all: listed.ok ? '' : 'Could not load vault items. Try Sync vault.',
        }));
        setLoading(false);
      })
      .catch(() => {
        if (!alive.current || version !== listVersion.current) return;
        setListError((current) => ({
          ...current,
          all: 'Could not load vault items. Try Sync vault.',
        }));
        setLoading(false);
      });
    return () => {
      ++listVersion.current;
    };
  }, [state.itemsRevision]);

  const loadFolders = useCallback(async () => {
    const version = ++folderVersion.current;
    try {
      const listed = await window.strongroom.folders();
      if (!alive.current || version !== folderVersion.current) return;
      if (listed.ok) {
        setFolders(listed.value);
        setFoldersLoaded(true);
      }
    } catch {
      // Keep the folders already shown; the next sync retries.
    }
  }, []);
  useEffect(() => {
    void loadFolders();
    return () => {
      ++folderVersion.current;
    };
  }, [loadFolders, state.itemsRevision]);
  useEffect(() => {
    if (
      foldersLoaded &&
      filter.startsWith('folder:') &&
      !folders.some((f) => `folder:${f.id}` === filter)
    )
      setFilter('all');
  }, [foldersLoaded, folders, filter]);

  useEffect(() => {
    if (filter !== 'trash') return;
    let current = true;
    setTrashLoading(true);
    void window.strongroom
      .trash()
      .then((result) => {
        if (!alive.current || !current) return;
        if (result.ok) setTrashed(result.value);
        setListError((previous) => ({
          ...previous,
          trash: result.ok ? '' : 'Could not load Trash. Try Sync vault.',
        }));
        setTrashLoading(false);
      })
      .catch(() => {
        if (!alive.current || !current) return;
        setListError((previous) => ({
          ...previous,
          trash: 'Could not load Trash. Try Sync vault.',
        }));
        setTrashLoading(false);
      });
    return () => {
      current = false;
    };
  }, [filter, state.itemsRevision]);

  const currentModal = useRef(modal);
  currentModal.current = modal;
  const runCommand = useCallback((command: 'search' | 'new' | 'settings') => {
    if (!alive.current) return;
    if (command === 'search' && currentModal.current === 'search') {
      setModal(null);
      return;
    }
    if (currentModal.current || hasModal()) return;
    if (command === 'search') {
      setModal('search');
    }
    if (command === 'new') {
      newButton.current?.focus();
      setModal('new');
    }
    if (command === 'settings') {
      settingsButton.current?.focus();
      setModal('settings');
    }
  }, []);

  useEffect(() => window.strongroom.onCommand(runCommand), [runCommand]);
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.isComposing) return;
      const command = ({ k: 'search', n: 'new', ',': 'settings' } as const)[
        event.key.toLowerCase() as 'k' | 'n' | ','
      ];
      if (!command) return;
      event.preventDefault();
      if (!event.repeat) runCommand(command);
    };
    addEventListener('keydown', keyboard);
    return () => removeEventListener('keydown', keyboard);
  }, [runCommand]);

  const indexed = useMemo(() => indexItems(items), [items]);
  const indexedTrash = useMemo(() => indexItems(trashed), [trashed]);
  const visible = useMemo(() => {
    const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
    const source = filter === 'trash' ? indexedTrash : indexed;
    return source
      .filter(({ item, haystack }) => {
        if (filter === 'favorites' && !item.favorite) return false;
        if (filter === 'logins' && item.type !== 1) return false;
        if (filter === 'notes' && item.type !== 2) return false;
        if (filter === 'passkeys' && !item.hasPasskey) return false;
        if (filter === 'nofolder' && item.folderId) return false;
        if (filter.startsWith('folder:') && item.folderId !== filter.slice(7)) return false;
        return terms.every((term) => haystack.includes(term));
      })
      .map(({ item }) => item);
  }, [indexed, indexedTrash, query, filter]);
  const folderCounts = useMemo(() => {
    const counts = new Map<string, number>();
    let none = 0;
    for (const item of items) {
      if (item.folderId) counts.set(item.folderId, (counts.get(item.folderId) ?? 0) + 1);
      else none++;
    }
    return { counts, none };
  }, [items]);
  const selectionVisible = !!selectedId && visible.some((item) => item.id === selectedId);

  useLayoutEffect(() => {
    if (!selectedId || selectionVisible) return;
    selectionVersion.current++;
    setSelection({ status: 'unselected' });
  }, [selectedId, selectionVisible]);

  async function select(item: ItemSummary, refresh = false) {
    if (!alive.current) return;
    const version = ++selectionVersion.current;
    if (
      !refresh ||
      selection.status !== 'ready' ||
      selection.item.id !== item.id ||
      item.restricted
    )
      setSelection({ status: item.restricted ? 'restricted' : 'loading', id: item.id });
    if (item.restricted) return;
    try {
      const response = await window.strongroom.detail(item.id);
      if (!alive.current || version !== selectionVersion.current) return;
      if (response.ok) {
        setSelection({ status: 'ready', item: response.value });
        return response.value;
      } else {
        setSelection({ status: 'error', id: item.id });
      }
    } catch {
      if (!alive.current || version !== selectionVersion.current) return;
      setSelection({ status: 'error', id: item.id });
    }
  }

  async function toggleFavorite(item: ItemSummary) {
    if (!alive.current || favoriteWorking.current) return;
    favoriteWorking.current = true;
    setFavoritePending(item.id);
    try {
      const result = await window.strongroom.setFavorite(item.id, !item.favorite);
      if (!alive.current) return;
      if (result.ok)
        setItems((current) =>
          current.map((entry) => (entry.id === item.id ? result.value : entry)),
        );
      else notify.show('error', result.error);
    } catch {
      notify.show('error', 'Could not update favorites. Try again.');
    } finally {
      favoriteWorking.current = false;
      if (alive.current) setFavoritePending('');
    }
  }

  const menuWorking = useRef(false);
  async function showItemMenu(item: ItemSummary, position: MenuPosition) {
    if (!alive.current || menuWorking.current || modal || hasModal()) return;
    menuWorking.current = true;
    let pending: ReturnType<Notifier['show']> | undefined;
    try {
      // Select before opening the menu so both the highlight and Edit target
      // follow the clicked row, even when a different detail request is pending.
      const detail = await select(item);
      if (!detail || !alive.current || hasModal()) return;
      const version = selectionVersion.current;
      const current = () => alive.current && version === selectionVersion.current;
      const result = await window.strongroom.itemMenu(item.id, position);
      if (!current() || hasModal()) return;
      if (!result.ok) {
        notify.show('error', result.error);
        return;
      }
      const action = result.value;
      if (!action) return;
      if (action === 'edit') {
        if (detail.editable && !hasModal()) setModal('edit');
        return;
      }
      if (action === 'copyUsername' || action === 'copyPassword') {
        const field = action === 'copyUsername' ? 'username' : 'password';
        const copied = await window.strongroom.copy(item.id, field);
        if (current())
          notify.show(
            copied.ok ? 'done' : 'error',
            copied.ok ? `${field === 'username' ? 'Username' : 'Password'} copied` : copied.error,
          );
        return;
      }
      if (action === 'trash') {
        const confirmation = await window.strongroom.confirm('trash');
        if (!current()) return;
        if (!confirmation.ok) {
          notify.show('error', confirmation.error);
          return;
        }
        if (!confirmation.value) return;
      }
      const restore = action === 'restore';
      pending = notify.show('pending', restore ? 'Restoring…' : 'Moving to Trash…');
      const changed = await (restore ? window.strongroom.restore(item.id) : window.strongroom.remove(item.id));
      if (!alive.current) return;
      notify.settle(
        pending,
        changed.ok ? 'done' : 'error',
        changed.ok ? (restore ? 'Restored to your vault' : 'Moved to Trash') : changed.error,
      );
      // State publication can already have cleared or refreshed the selection.
      if (changed.ok && current()) {
        selectionVersion.current++;
        setSelection({ status: 'unselected' });
      }
    } catch {
      if (alive.current) {
        if (pending) notify.settle(pending, 'error', 'Could not update the item.');
        else notify.show('error', 'Could not open the item menu. Try again.');
      }
    } finally {
      menuWorking.current = false;
    }
  }

  const refreshSelection = useRef(select);
  refreshSelection.current = select;
  useEffect(() => {
    if (!selectedId) return;
    const item =
      items.find((entry) => entry.id === selectedId) ??
      trashed.find((entry) => entry.id === selectedId);
    if (item) void refreshSelection.current(item, true);
  }, [state.itemsRevision]);

  async function setBiometrics(enabled: boolean) {
    if (!alive.current) return;
    const pending = notify.show(
      'pending',
      enabled ? 'Setting up Touch ID…' : 'Turning off Touch ID…',
    );
    try {
      const result = await window.strongroom.setBiometrics(enabled);
      if (!alive.current) return;
      if (result.ok) {
        notify.settle(pending, 'done', enabled ? 'Touch ID is on' : 'Touch ID is off');
        onState(result.value);
      } else notify.settle(pending, 'error', 'Could not change Touch ID. Try again.');
    } catch {
      notify.settle(pending, 'error', 'Could not change Touch ID. Try again.');
    }
  }

  async function sync() {
    if (syncing || !alive.current) return;
    setSyncing(true);
    const pending = notify.show('pending', 'Syncing with Bitwarden…');
    try {
      const response = await window.strongroom.sync();
      if (!alive.current) return;
      setSyncing(false);
      if (response.ok) {
        notify.settle(pending, 'done', 'Vault up to date');
        onState(response.value);
      } else
        notify.settle(pending, 'error', 'Could not sync. Check your connection and try again.');
    } catch {
      if (!alive.current) return;
      setSyncing(false);
      notify.settle(pending, 'error', 'Could not sync. Check your connection and try again.');
    }
  }

  async function submitFolder(name: string) {
    if (!alive.current || folderWorking.current || !folderEdit) return;
    const edit = folderEdit;
    folderWorking.current = true;
    setFolderBusy(true);
    try {
      const result =
        edit.mode === 'create'
          ? await window.strongroom.createFolder(name)
          : await window.strongroom.renameFolder(edit.folder.id, name);
      if (!alive.current) return;
      if (result.ok) {
        setFolderEdit(null);
        void loadFolders();
      } else notify.show('error', result.error);
    } catch {
      notify.show('error', 'Could not save the folder. Try again.');
    } finally {
      folderWorking.current = false;
      if (alive.current) setFolderBusy(false);
    }
  }

  async function removeFolder(folder: Folder) {
    if (!alive.current || folderWorking.current || modal || hasModal()) return;
    folderWorking.current = true;
    setFolderBusy(true);
    let pending: ReturnType<Notifier['show']> | undefined;
    try {
      const confirmation = await window.strongroom.confirm('deleteFolder');
      if (!alive.current) return;
      if (!confirmation.ok) {
        notify.show('error', confirmation.error);
        return;
      }
      if (!confirmation.value) return;
      pending = notify.show('pending', 'Deleting folder…');
      const result = await window.strongroom.deleteFolder(folder.id);
      if (!alive.current) return;
      notify.settle(
        pending,
        result.ok ? 'done' : 'error',
        result.ok ? 'Folder deleted' : result.error,
      );
      if (result.ok) {
        if (filter === `folder:${folder.id}`) setFilter('all');
        void loadFolders();
      }
    } catch {
      if (alive.current) {
        if (pending) notify.settle(pending, 'error', 'Could not delete the folder.');
        else notify.show('error', 'Could not delete the folder. Try again.');
      }
    } finally {
      folderWorking.current = false;
      if (alive.current) setFolderBusy(false);
    }
  }

  const activeFolder = filter.startsWith('folder:')
    ? folders.find((entry) => `folder:${entry.id}` === filter)
    : undefined;
  const currentFilter: { label: string; empty?: string; description?: string } =
    filter === 'nofolder'
      ? {
          label: 'No folder',
          empty: 'No unfiled items',
          description: 'Items that are not in a folder appear here.',
        }
      : activeFolder
        ? {
            label: activeFolder.name,
            empty: 'This folder is empty',
            description: 'Choose this folder when you add or edit an item.',
          }
        : (filters.find((entry) => entry.id === filter) ?? filters[0]);
  const newItemFolder = activeFolder ? activeFolder.id : null;
  const activeDetail = selectionVisible ? selection.status : 'unselected';
  const currentListError = filter === 'trash' ? listError.trash : listError.all;
  return (
    <TooltipProvider>
      <div className="app vault-app">
        <main
          className="workspace"
          aria-label="Personal vault"
          data-settings-open={settings}
          aria-hidden={settings || undefined}
          inert={settings}
        >
          <aside className="sidebar">
            <div className="workspace-titlebar" aria-hidden="true" />
            <div className="vault-label">
              <span className="vault-avatar" aria-hidden="true">
                {Array.from(state.email.trim())[0]?.toLocaleUpperCase() || 'L'}
              </span>
              <div>
                <strong>Personal vault</strong>
                <small title={state.email}>{state.email || 'Bitwarden'}</small>
              </div>
            </div>
            <nav aria-label="Vault filters">
              {filters.map(({ id, label, icon: Icon }) => (
                <Button
                  type="button"
                  variant="sidebar"
                  key={id}
                  className={`nav-item ${filter === id ? 'active' : ''}`}
                  aria-pressed={filter === id}
                  onClick={() => setFilter(id)}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                  {id === 'all' && <small>{items.length.toLocaleString()}</small>}
                  {id === 'trash' && state.trashLoaded && state.trashCount > 0 && (
                    <small>{state.trashCount.toLocaleString()}</small>
                  )}
                </Button>
              ))}
            </nav>
            <nav className="folder-nav" aria-label="Folders">
              <div className="nav-heading">
                <span>Folders</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label="New folder"
                      disabled={folderBusy}
                      onClick={() => setFolderEdit({ mode: 'create' })}
                    >
                      <Plus size={14} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>New folder</TooltipContent>
                </Tooltip>
              </div>
              {folderEdit?.mode === 'create' && (
                <FolderForm
                  label="New folder name"
                  initial=""
                  busy={folderBusy}
                  onSubmit={(name) => void submitFolder(name)}
                  onCancel={() => setFolderEdit(null)}
                />
              )}
              {folders.map((folder) =>
                folderEdit?.mode === 'rename' && folderEdit.folder.id === folder.id ? (
                  <FolderForm
                    key={folder.id}
                    label="Folder name"
                    initial={folder.name}
                    busy={folderBusy}
                    onSubmit={(name) => void submitFolder(name)}
                    onCancel={() => setFolderEdit(null)}
                  />
                ) : (
                  <div className="folder-row" key={folder.id}>
                    <Button
                      type="button"
                      variant="sidebar"
                      className={`nav-item ${filter === `folder:${folder.id}` ? 'active' : ''}`}
                      aria-pressed={filter === `folder:${folder.id}`}
                      onClick={() => setFilter(`folder:${folder.id}`)}
                    >
                      <FolderSimple size={16} />
                      <span title={folder.name}>{folder.name}</span>
                      <small>{(folderCounts.counts.get(folder.id) ?? 0).toLocaleString()}</small>
                    </Button>
                    <div className="folder-actions">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`Rename ${folder.name}`}
                        disabled={folderBusy}
                        onClick={() => setFolderEdit({ mode: 'rename', folder })}
                      >
                        <PencilSimple size={13} />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`Delete ${folder.name}`}
                        disabled={folderBusy}
                        onClick={() => void removeFolder(folder)}
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </div>
                ),
              )}
              <Button
                type="button"
                variant="sidebar"
                className={`nav-item ${filter === 'nofolder' ? 'active' : ''}`}
                aria-pressed={filter === 'nofolder'}
                onClick={() => setFilter('nofolder')}
              >
                <FolderSimple size={16} />
                <span>No folder</span>
                <small>{folderCounts.none.toLocaleString()}</small>
              </Button>
            </nav>
            <div className="sidebar-bottom">
              <Separator />
              <Button
                ref={settingsButton}
                type="button"
                variant="sidebar"
                className="nav-item"
                onClick={() => runCommand('settings')}
              >
                <Settings2 size={16} />
                <span>Settings</span>
              </Button>
            </div>
          </aside>
          <section className="item-list" aria-label={currentFilter.label}>
            <ItemList
              onFavorite={filter === 'trash' ? undefined : toggleFavorite}
              favoritePending={favoritePending}
              revealSelection={revealSelection}
              onItemMenu={(item, position) => void showItemMenu(item, position)}
              header={
                <>
                  <header className="workspace-list-toolbar">
                    <InputGroup>
                      <InputGroupAddon>
                        <Search size={16} />
                      </InputGroupAddon>
                      <InputGroupInput
                        ref={searchInput}
                        aria-label="Search vault"
                        placeholder="Search vault"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                      />
                      <InputGroupAddon align="inline-end">
                        {!query && (
                          <InputGroupButton
                            size="sm"
                            aria-label="Quick open (⌘K)"
                            onClick={() => runCommand('search')}
                          >
                            <Kbd>⌘K</Kbd>
                          </InputGroupButton>
                        )}
                        {query && (
                          <InputGroupButton
                            size="icon-xs"
                            aria-label="Clear search"
                            onClick={() => {
                              setQuery('');
                              searchInput.current?.focus();
                            }}
                          >
                            <X size={14} />
                          </InputGroupButton>
                        )}
                      </InputGroupAddon>
                    </InputGroup>
                  </header>
                  <header className="list-heading">
                    <h1>{query ? 'Search results' : currentFilter.label}</h1>
                    <span>{visible.length.toLocaleString()}</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Sync vault"
                          aria-busy={syncing}
                          disabled={syncing}
                          onClick={() => void sync()}
                        >
                          {syncing ? <Spinner /> : <RefreshCw size={14} />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Sync vault</TooltipContent>
                    </Tooltip>
                  </header>
                  {currentListError && visible.length > 0 && (
                    <Alert variant="destructive" className="workspace-list-error">
                      <AlertCircle />
                      <AlertDescription>{currentListError}</AlertDescription>
                    </Alert>
                  )}
                </>
              }
              items={visible}
              selectedId={selectionVisible ? selectedId : ''}
              onSelect={(item) => void select(item)}
              query={query}
              onNew={() => runCommand('new')}
              emptyLabel={currentFilter.empty}
              emptyDescription={currentFilter.description}
              loading={filter === 'trash' ? trashLoading : loading}
              error={currentListError}
            />
            <footer className="list-footer">
              <Button
                ref={newButton}
                type="button"
                variant="ghost"
                className="workspace-new"
                onClick={() => runCommand('new')}
              >
                <Plus size={16} />
                New login<Kbd>⌘N</Kbd>
              </Button>
            </footer>
          </section>
          <section
            className="detail-pane"
            aria-label="Item details"
            aria-busy={activeDetail === 'loading'}
            onContextMenu={(event) => {
              if (!selected || !selectionVisible) return;
              const target = event.target as HTMLElement;
              if (target.closest('input, textarea, [contenteditable="true"]')) return;
              // Selected notes and URLs retain standard text Copy. Credentials
              // always use the timed clipboard API, including revealed passwords.
              if (!target.closest('[data-credential]') && window.getSelection()?.toString()) return;
              event.preventDefault();
              void showItemMenu(selected, {
                x: Math.round(event.clientX),
                y: Math.round(event.clientY),
              });
            }}
          >
            {selected && selectionVisible ? (
              <Detail
                key={selected.id}
                item={selected}
                onEdit={() => {
                  if (!hasModal()) setModal('edit');
                }}
                onGone={() => {
                  if (!alive.current) return;
                  selectionVersion.current++;
                  setSelection({ status: 'unselected' });
                }}
                onUpdated={(updated) => {
                  if (!alive.current) return;
                  setSelection((current) =>
                    current.status === 'ready' && current.item.id === updated.id
                      ? { status: 'ready', item: updated }
                      : current,
                  );
                }}
                notify={notify}
              />
            ) : (
              <Empty className="workspace-detail-empty" role="status">
                <EmptyHeader>
                  <EmptyMedia>
                    {activeDetail === 'loading' ? (
                      <Spinner />
                    ) : activeDetail === 'restricted' ? (
                      <LockKeyhole size={24} />
                    ) : activeDetail === 'error' ? (
                      <AlertCircle size={24} />
                    ) : (
                      <Mark size={28} />
                    )}
                  </EmptyMedia>
                  <EmptyTitle>
                    {activeDetail === 'loading'
                      ? 'Loading item…'
                      : activeDetail === 'restricted'
                        ? 'Open this item in Bitwarden'
                        : activeDetail === 'error'
                          ? 'Could not load item'
                          : query && !visible.length
                            ? 'No matching items'
                            : 'Select an item'}
                  </EmptyTitle>
                  <EmptyDescription>
                    {activeDetail === 'loading'
                      ? 'Reading item details.'
                      : activeDetail === 'restricted'
                        ? 'Shared and protected items are available in the official Bitwarden client.'
                        : activeDetail === 'error'
                          ? 'Could not load this item. Try again.'
                          : query && !visible.length
                            ? 'Change or clear your search to see more items.'
                            : 'Choose an item to view its details.'}
                  </EmptyDescription>
                </EmptyHeader>
                {activeDetail === 'error' && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const item = visible.find((entry) => entry.id === selectedId);
                      if (item) void select(item);
                    }}
                  >
                    Try again
                  </Button>
                )}
                {query && !visible.length && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setQuery('');
                      searchInput.current?.focus();
                    }}
                  >
                    Clear search
                  </Button>
                )}
              </Empty>
            )}
          </section>
        </main>
        {modal === 'search' && (
          <QuickOpen
            indexed={indexed}
            loading={loading}
            error={listError.all}
            onClose={() => setModal(null)}
            onSelect={(item) => {
              if (!alive.current) return;
              setModal(null);
              setQuery('');
              setFilter('all');
              setRevealSelection((request) => request + 1);
              if (item.id !== selectedId || selection.status === 'error') void select(item);
            }}
          />
        )}
        {(modal === 'new' || modal === 'edit') && (
          <Editor
            item={modal === 'edit' ? selected : null}
            folders={folders}
            defaultFolderId={newItemFolder}
            defaultType={filter === 'notes' ? 2 : 1}
            onClose={() => {
              if (alive.current) setModal(null);
            }}
            onSaved={(item) => {
              if (!alive.current) return;
              selectionVersion.current++;
              setModal(null);
              // Keep summaries secret-free, including the newly created item while
              // its broadcast list refresh is still in flight.
              const {
                id,
                name,
                username,
                website,
                type,
                favorite,
                hasPasskey,
                restricted,
                folderId,
              } = item;
              setItems((current) => [
                ...current.filter((entry) => entry.id !== id),
                { id, name, username, website, type, favorite, hasPasskey, restricted, folderId },
              ]);
              setQuery('');
              setFilter('all');
              setSelection({ status: 'ready', item });
            }}
            notify={notify}
          />
        )}
        {settings && (
          <Settings
            onClose={() => {
              if (!alive.current) return;
              flushSync(() => setModal(null));
              settingsButton.current?.focus({ preventScroll: true });
            }}
            biometrics={state.biometrics}
            biometricsOn={state.biometricsOn}
            onBiometrics={setBiometrics}
          />
        )}
        <Toasts />
      </div>
    </TooltipProvider>
  );
}

function FolderForm({
  label,
  initial,
  busy,
  onSubmit,
  onCancel,
}: {
  label: string;
  initial: string;
  busy: boolean;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    input.current?.focus();
    input.current?.select();
  }, []);
  return (
    <form
      className="folder-form"
      onSubmit={(event) => {
        event.preventDefault();
        const trimmed = name.trim();
        if (trimmed && !busy) onSubmit(trimmed);
      }}
    >
      <Input
        ref={input}
        aria-label={label}
        value={name}
        maxLength={500}
        disabled={busy}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== 'Escape') return;
          event.preventDefault();
          event.stopPropagation();
          onCancel();
        }}
      />
    </form>
  );
}
