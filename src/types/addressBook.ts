// Address Book types and interfaces
export interface SavedAddress {
    id: string
    name: string
    address: string
    description?: string
    dateAdded: Date
    lastUsed?: Date
    useCount: number
    isOwnWallet?: boolean // Flag to indicate this is one of the user's own wallet addresses
}

export interface AddressBookData {
    addresses: SavedAddress[]
}
