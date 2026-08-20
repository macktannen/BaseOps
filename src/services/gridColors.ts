export const COLOR_PALETTE: string[] = ['#8b5cf6', '#ed8936', '#e53e3e', '#3182ce', '#38a169', '#d69e2e', '#805ad5', '#dd6b20', '#2b6cb0', '#b83280', '#276749', '#c05621'];

export const getColorForKey = (key: string): string => {
  if (!key) return '#8b5cf6';
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return COLOR_PALETTE[hash % COLOR_PALETTE.length];
};

export const TAG_COLORS: Record<string, string> = {
  'Emergency': '#ed8936',
  'Maintenance': '#e53e3e',
  'Training': '#805ad5'
};

const COLOR_SWAP_GROUPS: string[][] = [
  ['NIPSCO Electric', 'NISOURCE Communications']
];

interface AccountLike {
  id: string;
  name: string;
}

export const getAccountColor = (accountKey: string | AccountLike | null, accountsList: AccountLike[] = []): string => {
  let account: AccountLike | null = null;
  if (typeof accountKey === 'object' && accountKey !== null) {
    account = accountKey;
  } else {
    account = accountsList.find(a => a.id === accountKey || a.name === accountKey) || null;
  }
  const key = account ? account.id : (typeof accountKey === 'string' ? accountKey : '');
  const name = account ? account.name : (typeof accountKey === 'string' ? accountKey : '');

  for (const group of COLOR_SWAP_GROUPS) {
    const idx = group.indexOf(name);
    if (idx !== -1) {
      const otherName = group[(idx + 1) % group.length];
      const other = accountsList.find(a => a.name === otherName);
      if (other) return getColorForKey(other.id);
      return getColorForKey(otherName);
    }
  }
  return getColorForKey(key);
};
