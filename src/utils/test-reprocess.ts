/**
 * Test script to verify transaction reprocessing works correctly
 */

import { WalletService } from '../services/WalletService'
import { StorageService } from '../services/StorageService'
import { ElectrumService } from '../services/ElectrumService'

export async function testReprocessing() {
    try {
        // Initialize services
        const electrum = new ElectrumService()
        const wallet = new WalletService(electrum)

        // Get active wallet
        const activeWallet = await StorageService.getActiveWallet()
        if (!activeWallet) {
            console.error('No active wallet found')
            return
        }
        // Get current transaction count
        const beforeTxs = await StorageService.getTransactionHistory(activeWallet.address)
        // Test reprocessing
        const processedCount = await wallet.reprocessTransactionHistory(activeWallet.address)
        // Check results
        const afterTxs = await StorageService.getTransactionHistory(activeWallet.address)
        // Analyze transaction types
        const sentTxs = afterTxs.filter(tx => tx.type === 'send')
        const receivedTxs = afterTxs.filter(tx => tx.type === 'receive')
        // Show some example transactions
        sentTxs.slice(0, 3).forEach((tx, i) => {
        })

        receivedTxs.slice(0, 3).forEach((tx, i) => {
        })
    } catch (error) {
        console.error('Test failed:', error)
    }
}

// Auto-run if this file is executed directly
if (typeof window !== 'undefined') {
    (window as any).testReprocessing = testReprocessing
}
