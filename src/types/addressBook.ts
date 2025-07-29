// Address Book types and interfaces
export interface SavedAddress {
  id: string;
  name: string;
  address: string;
  description?: string;
  dateAdded: Date;
  lastUsed?: Date;
  useCount: number;
  isOwnWallet?: boolean; // Flag to indicate this is one of the user's own wallet addresses
  tags?: string[]; // Array of tags associated with this address
  category?: string; // Contact category/group
  // Note: Avatars are now auto-generated using minidenticons based on address
}

export interface AddressBookData {
  addresses: SavedAddress[];
}

export interface ContactCategory {
  id: string;
  name: string;
  icon?: string;
  color?: string;
}

export const DEFAULT_CATEGORIES: ContactCategory[] = [
  { id: 'personal', name: 'Personal', icon: '👤', color: '#3B82F6' },
  { id: 'business', name: 'Business', icon: '🏢', color: '#059669' },
  { id: 'exchange', name: 'Exchange', icon: '🏦', color: '#DC2626' },
  { id: 'family', name: 'Family', icon: '👨‍👩‍👧‍👦', color: '#7C3AED' },
  { id: 'friends', name: 'Friends', icon: '👥', color: '#EA580C' },
  { id: 'services', name: 'Services', icon: '🛠️', color: '#0891B2' },
  { id: 'other', name: 'Other', icon: '📋', color: '#6B7280' },
];

export interface QRScanResult {
  address: string;
  amount?: number;
  label?: string;
  message?: string;
}
