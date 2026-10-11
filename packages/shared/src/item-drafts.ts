import type { CardBody, IdentityBody, ItemDetail, ItemDraft, SshKeyBody, UriDraft } from './types';
import { uriMatchSchema } from './protocol';
import { webUrl } from './urls';

export const uriMatchOptions = [
  { value: '', label: 'Default (base domain)' },
  { value: '0', label: 'Base domain' },
  { value: '1', label: 'Host' },
  { value: '2', label: 'Starts with' },
  { value: '3', label: 'Exact' },
  { value: '5', label: 'Never' },
];
export const emptyCard: CardBody = {
  cardholderName: '',
  brand: '',
  number: '',
  expMonth: '',
  expYear: '',
  code: '',
};
export const emptyIdentity: IdentityBody = {
  title: '',
  firstName: '',
  middleName: '',
  lastName: '',
  username: '',
  company: '',
  ssn: '',
  passportNumber: '',
  licenseNumber: '',
  email: '',
  phone: '',
  address1: '',
  address2: '',
  address3: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
};
export const emptySshKey: SshKeyBody = { publicKey: '', privateKey: '', keyFingerprint: '' };
export function editableUri(row: ItemDetail['uris'][number]) {
  return (
    row.uri !== null &&
    Boolean(webUrl(row.uri.includes('://') ? row.uri : `https://${row.uri}`)) &&
    uriMatchSchema.safeParse(row.match).success
  );
}
export function itemDraft(item: ItemDetail): ItemDraft {
  const base = {
    id: item.id,
    revisionDate: item.revisionDate,
    name: item.name,
    notes: item.notes,
    favorite: item.favorite,
    folderId: item.folderId,
    fields: item.fieldDrafts,
  };
  if (item.type === 2) return { ...base, type: 2 };
  if (item.type === 3) return { ...base, type: 3, ...(item.card ?? emptyCard) };
  if (item.type === 4) return { ...base, type: 4, ...(item.identity ?? emptyIdentity) };
  if (item.type === 5) return { ...base, type: 5, ...(item.sshKey ?? emptySshKey) };
  return {
    ...base,
    type: 1,
    username: item.username,
    password: item.password,
    uris: item.uris.map((row): UriDraft => {
      const match = uriMatchSchema.safeParse(row.match);
      return editableUri(row) && row.uri !== null && match.success
        ? { action: 'write', sourceIndex: row.sourceIndex, uri: row.uri, match: match.data }
        : { action: 'keep', sourceIndex: row.sourceIndex };
    }),
  };
}
