/**
 * Debug script to analyze transaction classification issues
 * Run this in the browser console to debug transaction classification
 */

export async function debugTransactionClassification() {
    const { StorageService } = await import('../services/StorageService')
    const { WalletService } = await import('../services/WalletService')
    const { ElectrumService } = await import('../services/ElectrumService')
    // Get current wallet info
    const activeWallet = await StorageService.getActiveWallet()
    if (!activeWallet) {
        console.error('No active wallet found')
        return
    }
    // Get all wallets to check address matching
    const allWallets = await StorageService.getAllWallets()
    // Get current transactions from database
    const dbTransactions = await StorageService.getTransactionHistory()
    // Show received transactions specifically
    const receivedTxs = dbTransactions.filter(tx => tx.type === 'receive')
    receivedTxs.forEach(tx => {
    })

    // Test address matching for known received transaction
    const testTxId = '6f86d925618184d753437419aa1e6e68052ec03566ef89d73a3179aec6e33744'
    const testAddress = 'RQ8dWSnb5RtQJddcPH4FNuxA8EtxSy7GZH'
    // Check if it matches any wallet
    const electrum = new ElectrumService()
    const wallet = new WalletService(electrum)
    const isOurAddr = await (wallet as any).isOurAddress(testAddress)
    // Check what addresses are in our wallet system
}

// Make it available globally for console testing
if (typeof window !== 'undefined') {
    (window as any).debugTransactionClassification = debugTransactionClassification
}
