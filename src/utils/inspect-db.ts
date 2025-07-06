/**
 * Simple database inspection tool
 * Run this in browser console to check database state
 */

export async function inspectTransactionDatabase() {
    const { StorageService } = await import('../services/StorageService')
    // Get current wallet address
    const activeWallet = await StorageService.getActiveWallet()
    // Get ALL transactions (no filter)
    const allTransactions = await StorageService.getTransactionHistory()
    // Show recent transactions
    allTransactions.forEach((tx, i) => {
    })

    // Check received transactions specifically
    const receivedTxs = allTransactions.filter(tx => tx.type === 'receive')
    receivedTxs.forEach((tx, i) => {
    })

    // Test query with current address
    if (activeWallet?.address) {
        const addressFilteredTxs = await StorageService.getTransactionHistory(activeWallet.address)
        addressFilteredTxs.forEach((tx, i) => {
        })
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    (window as any).inspectTransactionDatabase = inspectTransactionDatabase
}
