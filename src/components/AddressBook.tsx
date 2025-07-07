'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Check, X, Search, User, Clock, Coins } from 'lucide-react'
import { StorageService } from '@/services/StorageService'
import { SavedAddress } from '@/types/addressBook'

interface AddressBookProps {
    onSelectAddress: (address: string) => void
    currentAddress?: string
}

export default function AddressBook({ onSelectAddress, currentAddress }: AddressBookProps) {
    const [addresses, setAddresses] = useState<SavedAddress[]>([])
    const [isAddingNew, setIsAddingNew] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [newAddress, setNewAddress] = useState({
        name: '',
        address: '',
        description: ''
    })

    useEffect(() => {
        loadAddresses()
    }, [])

    const loadAddresses = async () => {
        try {
            const savedAddresses = await StorageService.getSavedAddresses()
            // Sort by most recently used, then by name
            const sortedAddresses = savedAddresses.sort((a, b) => {
                if (a.lastUsed && b.lastUsed) {
                    return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime()
                }
                if (a.lastUsed && !b.lastUsed) return -1
                if (!a.lastUsed && b.lastUsed) return 1
                return a.name.localeCompare(b.name)
            })
            setAddresses(sortedAddresses)
        } catch (error) {
            console.error('Failed to load addresses:', error)
        }
    }

    const handleSaveNew = async () => {
        if (!newAddress.name.trim() || !newAddress.address.trim()) return

        const addressData: SavedAddress = {
            id: '',
            name: newAddress.name.trim(),
            address: newAddress.address.trim(),
            description: newAddress.description.trim() || undefined,
            dateAdded: new Date(),
            useCount: 0
        }

        const success = await StorageService.saveAddress(addressData)
        if (success) {
            setNewAddress({ name: '', address: '', description: '' })
            setIsAddingNew(false)
            await loadAddresses()
        }
    }

    const handleDelete = async (addressId: string) => {
        const success = await StorageService.deleteAddress(addressId)
        if (success) {
            await loadAddresses()
        }
    }

    const handleSelect = async (address: SavedAddress) => {
        await StorageService.updateAddressUsage(address.address)
        onSelectAddress(address.address)
        await loadAddresses() // Refresh to update usage stats
    }

    const filteredAddresses = searchQuery
        ? addresses.filter(addr =>
            addr.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            addr.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (addr.description && addr.description.toLowerCase().includes(searchQuery.toLowerCase()))
        )
        : addresses

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    Address Book ({addresses.length})
                </h3>
                <button
                    onClick={() => setIsAddingNew(true)}
                    className="flex items-center text-sm text-avian-600 hover:text-avian-700"
                >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Address
                </button>
            </div>

            {/* Search */}
            {addresses.length > 0 && (
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search addresses..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-avian-500 focus:border-transparent"
                    />
                </div>
            )}

            {/* Add New Address Form */}
            {isAddingNew && (
                <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700">
                    <div className="space-y-3">
                        <input
                            type="text"
                            placeholder="Address name (e.g., Exchange, Friend)"
                            value={newAddress.name}
                            onChange={(e) => setNewAddress({ ...newAddress, name: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                        />
                        <input
                            type="text"
                            placeholder="AVN address"
                            value={newAddress.address}
                            onChange={(e) => setNewAddress({ ...newAddress, address: e.target.value })}
                            className="w-full px-3 py-2 text-sm font-mono border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                        />
                        <input
                            type="text"
                            placeholder="Description (optional)"
                            value={newAddress.description}
                            onChange={(e) => setNewAddress({ ...newAddress, description: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={handleSaveNew}
                                disabled={!newAddress.name.trim() || !newAddress.address.trim()}
                                className="flex-1 flex items-center justify-center py-2 px-3 text-sm bg-avian-600 hover:bg-avian-700 disabled:bg-gray-400 text-white rounded-md transition-colors"
                            >
                                <Check className="w-4 h-4 mr-1" />
                                Save
                            </button>
                            <button
                                onClick={() => {
                                    setIsAddingNew(false)
                                    setNewAddress({ name: '', address: '', description: '' })
                                }}
                                className="flex-1 flex items-center justify-center py-2 px-3 text-sm bg-gray-500 hover:bg-gray-600 text-white rounded-md transition-colors"
                            >
                                <X className="w-4 h-4 mr-1" />
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Address List */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
                {filteredAddresses.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        {searchQuery ? 'No addresses match your search' : 'No saved addresses'}
                    </div>
                ) : (
                    filteredAddresses.map((address) => (
                        <div
                            key={address.id}
                            className={`p-3 border rounded-lg transition-colors cursor-pointer ${currentAddress === address.address
                                ? 'border-avian-500 bg-avian-50 dark:bg-avian-900/20'
                                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800'
                                }`}
                            onClick={() => handleSelect(address)}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        {address.isOwnWallet ? (
                                            <Coins className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                        ) : (
                                            <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                        )}
                                        <span className="font-medium text-sm text-gray-900 dark:text-white truncate">
                                            {address.name}
                                        </span>
                                        {address.isOwnWallet && (
                                            <span className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                                                My Wallet
                                            </span>
                                        )}
                                        {address.useCount > 0 && (
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                ({address.useCount} uses)
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs font-mono text-gray-600 dark:text-gray-300 truncate">
                                        {address.address}
                                    </div>
                                    {address.description && (
                                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                                            {address.description}
                                        </div>
                                    )}
                                    {address.lastUsed && (
                                        <div className="flex items-center gap-1 mt-1 text-xs text-gray-500 dark:text-gray-400">
                                            <Clock className="w-3 h-3" />
                                            Last used: {new Date(address.lastUsed).toLocaleDateString()}
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleDelete(address.id)
                                    }}
                                    className="ml-2 p-1 text-gray-400 hover:text-red-500 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
