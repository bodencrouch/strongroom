import type { TotpCode } from './totp';
export const MAX_BROWSER_MESSAGE_BYTES = 900_000;

export type WindowMaterial = 'glass' | 'vibrancy' | 'solid';
export type WindowCommand = 'search' | 'new' | 'settings';
export type NativeConfirmation =
  | 'discard'
  | 'trash'
  | 'deleteFolder'
  | 'deleteAttachment'
  | 'deleteSend'
  | 'exportPlain';
export type ItemMenuAction = 'copyUsername' | 'copyPassword' | 'edit' | 'trash' | 'restore';
export type MenuPosition = { x: number; y: number };
export const windowColorTokens = [
  'background',
  'foreground',
  'window',
  'card',
  'card-foreground',
  'popover',
  'popover-foreground',
  'primary',
  'primary-foreground',
  'secondary',
  'secondary-foreground',
  'muted',
  'muted-foreground',
  'border',
  'input',
  'ring',
  'selection',
  'selection-foreground',
  'selection-inactive',
  'sidebar',
  'sidebar-foreground',
  'sidebar-accent',
  'sidebar-accent-foreground',
  'sidebar-selection-inactive',
  'sidebar-border',
  'sidebar-ring',
] as const;
export type WindowAppearance = Readonly<{
  revision: number;
  material: WindowMaterial;
  active: boolean;
  dark: boolean;
  reducedTransparency: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
  colors?: Partial<Record<(typeof windowColorTokens)[number], string>>;
}>;

export type VaultStatus = 'signed-out' | 'locked' | 'unlocked';

export const lockTimeoutMinutes = [5, 15, 30, 60, 0] as const;
/** Zero disables idle locking; sleep and screen lock always lock the vault. */
export type LockTimeoutMinutes = (typeof lockTimeoutMinutes)[number];

export interface PasswordOptions {
  length: number;
  lowercase: boolean;
  uppercase: boolean;
  numbers: boolean;
  symbols: boolean;
  excludeAmbiguous: boolean;
}

export const defaultPasswordOptions: PasswordOptions = {
  length: 24,
  lowercase: true,
  uppercase: true,
  numbers: true,
  symbols: true,
  excludeAmbiguous: true,
};

/** Two-step login methods the Bitwarden CLI can complete. Security keys over WebAuthn and Duo cannot be used here. */
export type TwoStepMethod = 'authenticator' | 'yubikey' | 'email';

/** A verification step Bitwarden requires before sign-in can finish. */
export interface LoginChallenge {
  /** `method`: choose one of `methods`. `code`: enter a two-step code. `new-device`: enter the code emailed for this new device. */
  kind: 'method' | 'code' | 'new-device';
  email: string;
  methods: TwoStepMethod[];
  /** The method the code belongs to, when known. */
  method?: TwoStepMethod;
  /** Why the previous answer was rejected, if it was. */
  error?: string;
}

export type ChallengeAnswer = { code: string } | { method: TwoStepMethod } | { cancel: true };

export interface VaultState {
  /** Monotonic state version; duplicate or late IPC replies can be ignored. */
  revision: number;
  /** Changes only when active items change. */
  itemsRevision: number;
  /** Trash is fetched only when opened. */
  trashLoaded: boolean;
  status: VaultStatus;
  email: string;
  server: string;
  lastSync: string | null;
  itemCount: number;
  /** How many items are sitting in Bitwarden's trash. */
  trashCount: number;
  /** Whether this Mac can offer Touch ID at all, and whether it can right now. */
  biometrics: 'unsupported' | 'unavailable' | 'ready';
  /** Whether a session key is being kept so Touch ID can reopen the vault. */
  biometricsOn: boolean;
  setupError?: string;
  /** Present while a sign-in is waiting for the user to complete a verification step. */
  challenge?: LoginChallenge;
}

export interface ItemSummary {
  id: string;
  name: string;
  username: string;
  website: string;
  type: number;
  favorite: boolean;
  hasPasskey: boolean;
  restricted: boolean;
  /** The folder this item is filed in; null means no folder. */
  folderId: string | null;
}

/** A Bitwarden folder. */
export interface Folder {
  id: string;
  name: string;
}

/** A Bitwarden Send as listed. The text, password and link never reach the window. */
export interface SendSummary {
  id: string;
  name: string;
  /** 0 is a text Send, 1 is a file Send. */
  type: 0 | 1;
  /** The file name of a file Send. */
  fileName: string | null;
  deletionDate: string | null;
  expirationDate: string | null;
  maxAccessCount: number | null;
  accessCount: number;
  disabled: boolean;
  passwordSet: boolean;
}

/** A new Send. File Sends pick their file in a native dialog. */
export type SendDraft = {
  name: string;
  notes: string;
  /** Days until Bitwarden deletes the Send. */
  deleteInDays: number;
  /** Days until the Send stops working; null means never. */
  expireInDays: number | null;
  maxAccessCount: number | null;
  password: string;
  disabled: boolean;
  hideEmail: boolean;
} & ({ type: 'text'; text: string; hidden: boolean } | { type: 'file' });

export type ExportFormat = 'csv' | 'json' | 'encrypted_json';

/** Formats `bw import` accepts, read from the CLI's own list. */
export const importFormats = [
  ['bitwardenjson', 'Bitwarden (json)'],
  ['bitwardencsv', 'Bitwarden (csv)'],
  ['chromecsv', 'Chrome'],
  ['firefoxcsv', 'Firefox (csv)'],
  ['safaricsv', 'Safari and macOS (csv)'],
  ['edgecsv', 'Edge'],
  ['bravecsv', 'Brave'],
  ['operacsv', 'Opera'],
  ['vivaldicsv', 'Vivaldi'],
  ['arccsv', 'Arc'],
  ['lastpasscsv', 'LastPass'],
  ['1password1pux', '1Password (1pux/json)'],
  ['1password1pif', '1Password (1pif)'],
  ['1passwordwincsv', '1Password 6 and 7 Windows (csv)'],
  ['1passwordmaccsv', '1Password 6 and 7 Mac (csv)'],
  ['dashlanecsv', 'Dashlane (csv)'],
  ['dashlanejson', 'Dashlane (json)'],
  ['keepass2xml', 'KeePass 2 (xml)'],
  ['keepassxcsv', 'KeePassX (csv)'],
  ['keepercsv', 'Keeper (csv)'],
  ['keeperjson', 'Keeper (json)'],
  ['enpasscsv', 'Enpass (csv)'],
  ['enpassjson', 'Enpass (json)'],
  ['nordpasscsv', 'Nordpass (csv)'],
  ['protonpass', 'Proton Pass (zip/json)'],
  ['roboformcsv', 'RoboForm (csv)'],
  ['remembearcsv', 'RememBear (csv)'],
  ['passboltcsv', 'Passbolt (csv)'],
  ['zohovaultcsv', 'Zoho Vault (csv)'],
] as const;
export type ImportFormat = (typeof importFormats)[number][0];

/** A read-only field on a card, identity or SSH key. */
export interface ExtraField {
  label: string;
  value: string;
  secret: boolean;
  /** False for rows that only describe something, such as a linked field. */
  copyable?: boolean;
}

/** One earlier password on a login, newest first. */
export interface PasswordHistoryEntry {
  password: string;
  lastUsedDate: string | null;
}

/** A file attached to an item. */
export interface AttachmentInfo {
  id: string;
  fileName: string;
  size: string;
}

export interface ItemDetail extends ItemSummary {
  password: string;
  extra: ExtraField[];
  /** The item's custom fields, in the order Bitwarden stores them. */
  customFields: ExtraField[];
  /** The custom fields the editor can change. */
  fieldDrafts: FieldDraft[];
  card?: CardBody;
  identity?: IdentityBody;
  sshKey?: SshKeyBody;
  passwordHistory: PasswordHistoryEntry[];
  attachments: AttachmentInfo[];
  uris: { sourceIndex: number; uri: string | null; match: number | null }[];
  notes: string;
  revisionDate: string | null;
  createdDate: string | null;
  editable: boolean;
  deletable: boolean;
  restorable: boolean;
}

export interface LoginInput {
  email: string;
  password: string;
  server: string;
  clientId?: string;
  clientSecret?: string;
}

export type UriMatch = null | 0 | 1 | 2 | 3 | 5;
export type UriDraft =
  | { action: 'keep'; sourceIndex: number }
  | { action: 'write'; sourceIndex?: number; uri: string; match: UriMatch };
/** Bitwarden's card brand names. An empty string means no brand. */
export const cardBrands = [
  'Visa',
  'Mastercard',
  'Amex',
  'Discover',
  'Diners Club',
  'JCB',
  'Maestro',
  'UnionPay',
  'RuPay',
  'Other',
] as const;
export const cardMonths = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'] as const;
export interface CardBody {
  cardholderName: string;
  brand: '' | (typeof cardBrands)[number];
  number: string;
  expMonth: '' | (typeof cardMonths)[number];
  expYear: string;
  code: string;
}
export interface IdentityBody {
  title: string;
  firstName: string;
  middleName: string;
  lastName: string;
  username: string;
  company: string;
  ssn: string;
  passportNumber: string;
  licenseNumber: string;
  email: string;
  phone: string;
  address1: string;
  address2: string;
  address3: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}
export interface SshKeyBody {
  publicKey: string;
  privateKey: string;
  keyFingerprint: string;
}
/** An editable custom field: text (0), hidden (1) or boolean (2, value "true" or "false"). */
export interface FieldDraft {
  /** Position in the stored list. Omitted for a new field. */
  sourceIndex?: number;
  name: string;
  value: string;
  type: 0 | 1 | 2;
}
export type ItemDraft = {
  id?: string;
  revisionDate?: string | null;
  name: string;
  notes: string;
  favorite: boolean;
  /** Omitted: keep the current folder (edits) or use no folder (new items). */
  folderId?: string | null;
  /** Omitted: keep the stored custom fields. Linked fields are always kept. */
  fields?: FieldDraft[];
} & (
  | { type: 1; username: string; password: string; uris: UriDraft[] }
  | { type: 2 }
  | ({ type: 3 } & CardBody)
  | ({ type: 4 } & IdentityBody)
  | ({ type: 5 } & SshKeyBody)
);

export interface FillCredential {
  username: string;
  password: string;
}

/** What Strongroom would do with a sign-in the browser just watched happen. */
export interface CaptureOffer {
  action: 'none' | 'save' | 'update';
  /** The item that would be written, for the prompt to name. */
  name?: string;
}

export interface BrowserMatches {
  state: VaultStatus;
  items: ItemSummary[];
}

export interface BrowserSuggestions extends BrowserMatches {
  tabId: number | null;
  url: string;
}

export interface BrowserUnlockState {
  state: VaultStatus;
  canUseBiometrics: boolean;
}

export interface BrowserSaveResult {
  id: string;
}

export interface BrowserVaultPage {
  state: VaultStatus;
  revision: number;
  items: ItemSummary[];
  total: number;
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export interface MacAutoFillState {
  available: boolean;
  enabled: boolean;
  reason?: string;
}

export type Browser = 'safari' | 'chrome' | 'firefox';
export type BrowserSetup = Record<Browser, { available: boolean; reason?: string }>;

export type BrowserConnection = 'connected' | 'not-detected' | 'setup-error';

/** Vault health results. Only item names and counts leave the main process, never passwords. */
export interface HealthSummary {
  checked: number;
  reused: { names: string[] }[];
  weak: { name: string; reasons: string[] }[];
  insecure: { name: string }[];
  /** Present only when the breach lookup was requested. */
  exposed?: { name: string; count: number }[];
}

export interface StrongroomApi {
  lockTimeout(): Promise<Result<LockTimeoutMinutes>>;
  setLockTimeout(minutes: LockTimeoutMinutes): Promise<Result<LockTimeoutMinutes>>;
  macAutoFill(): Promise<Result<MacAutoFillState>>;
  enableMacAutoFill(): Promise<Result<MacAutoFillState>>;
  macAutoFillSettings(): Promise<Result<void>>;
  websiteIcons(): Promise<Result<boolean>>;
  setWebsiteIcons(enabled: boolean): Promise<Result<boolean>>;
  websiteIcon(id: string): Promise<Result<string | null>>;
  confirm(action: NativeConfirmation): Promise<Result<boolean>>;
  itemMenu(id: string, position: MenuPosition): Promise<Result<ItemMenuAction | null>>;
  state(): Promise<Result<VaultState>>;
  login(input: LoginInput): Promise<Result<VaultState>>;
  answerChallenge(answer: ChallengeAnswer): Promise<Result<void>>;
  unlock(password: string): Promise<Result<VaultState>>;
  unlockWithBiometrics(): Promise<Result<VaultState>>;
  setBiometrics(enabled: boolean): Promise<Result<VaultState>>;
  lock(): Promise<Result<VaultState>>;
  logout(): Promise<Result<VaultState>>;
  sync(): Promise<Result<VaultState>>;
  items(): Promise<Result<ItemSummary[]>>;
  trash(): Promise<Result<ItemSummary[]>>;
  folders(): Promise<Result<Folder[]>>;
  createFolder(name: string): Promise<Result<Folder>>;
  renameFolder(id: string, name: string): Promise<Result<Folder>>;
  deleteFolder(id: string): Promise<Result<VaultState>>;
  totp(id: string): Promise<Result<TotpCode | null>>;
  health(breaches: boolean): Promise<Result<HealthSummary>>;
  detail(id: string): Promise<Result<ItemDetail>>;
  save(draft: ItemDraft): Promise<Result<ItemDetail>>;
  setFavorite(id: string, favorite: boolean): Promise<Result<ItemSummary>>;
  remove(id: string): Promise<Result<VaultState>>;
  restore(id: string): Promise<Result<VaultState>>;
  copy(id: string, field: 'username' | 'password'): Promise<Result<void>>;
  copyExtra(id: string, index: number): Promise<Result<void>>;
  copyCustomField(id: string, index: number): Promise<Result<void>>;
  copyHistory(id: string, index: number): Promise<Result<void>>;
  downloadAttachment(id: string, attachmentId: string): Promise<Result<boolean>>;
  deleteAttachment(id: string, attachmentId: string): Promise<Result<ItemDetail>>;
  addAttachment(id: string): Promise<Result<ItemDetail | null>>;
  generate(options: PasswordOptions): Promise<Result<string>>;
  sends(): Promise<Result<SendSummary[]>>;
  createSend(draft: SendDraft): Promise<Result<SendSummary[] | null>>;
  deleteSend(id: string): Promise<Result<SendSummary[]>>;
  removeSendPassword(id: string): Promise<Result<SendSummary[]>>;
  copySendLink(id: string): Promise<Result<void>>;
  exportVault(format: ExportFormat): Promise<Result<boolean>>;
  importVault(format: ImportFormat): Promise<Result<VaultState | null>>;
  browserSetup(): Promise<Result<BrowserSetup>>;
  connectBrowser(browser: Browser): Promise<Result<void>>;
  browserConnection(): Promise<Result<BrowserConnection>>;
  openExtensionFolder(): Promise<Result<void>>;
  onState(listener: (state: VaultState) => void): () => void;
  appearance(): Promise<Result<WindowAppearance>>;
  onAppearance(listener: (appearance: WindowAppearance) => void): () => void;
  onCommand(listener: (command: WindowCommand) => void): () => void;
}
