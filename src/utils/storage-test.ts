// Storage test utilities for IndexedDB implementation
// This file can be used to test the IndexedDB storage functionality

import { StorageService } from '@/services/StorageService'

export async function testIndexedDBStorage() {
    try {
        // Test basic wallet operations
        await StorageService.setAddress('test-address-123')
        await StorageService.setPrivateKey('test-private-key-456')
        await StorageService.setMnemonic('test mnemonic phrase with twelve words here for testing purposes')
        await StorageService.setIsEncrypted(true)

        const address = await StorageService.getAddress()
        const privateKey = await StorageService.getPrivateKey()
        const mnemonic = await StorageService.getMnemonic()
        const isEncrypted = await StorageService.getIsEncrypted()
        // Test preferences
        await StorageService.setCurrency('EUR')
        await StorageService.setAVNUnits('mAVN')
        await StorageService.setSettings({ theme: 'dark', notifications: true })

        const currency = await StorageService.getCurrency()
        const avnUnits = await StorageService.getAVNUnits()
        const settings = await StorageService.getSettings()
        // Test transaction history
        await StorageService.saveTransaction({
            txid: 'test-tx-123',
            amount: 1000000,
            address: 'test-address-123',
            type: 'receive',
            timestamp: new Date(),
            confirmations: 6
        })

        const transactions = await StorageService.getTransactionHistory()
        // Test database info
        const dbInfo = await StorageService.getDatabaseInfo()
        // Test wallet existence
        const hasWallet = await StorageService.hasWallet()
    } catch (error) {
        console.error('❌ IndexedDB Storage test failed:', error)
    }
}

export async function clearTestData() {
    try {
        await StorageService.clearWallet()
        await StorageService.clearTransactionHistory()
    } catch (error) {
        console.error('❌ Failed to clear test data:', error)
    }
}
