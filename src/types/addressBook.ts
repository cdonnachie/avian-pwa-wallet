// Address Book types and interfaces
export interface SavedAddress {
    id: string
    name: string
    address: string
    description?: string
    dateAdded: Date
    lastUsed?: Date
    useCount: number
}

export interface AddressBookData {
    addresses: SavedAddress[]
}
