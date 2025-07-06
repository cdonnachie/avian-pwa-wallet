import { StorageService } from '@/services/StorageService'

export async function addSampleTransactions(walletAddress: string) {
    const sampleTransactions = [
        {
            txid: '1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890',
            amount: 1.5,
            address: 'AQoLYNBkFGRhZJMXi2HwM6PYkZ8sV9QwkN',
            type: 'receive' as const,
            timestamp: new Date(Date.now() - 86400000), // 1 day ago
            confirmations: 12,
            blockHeight: 123456
        },
        {
            txid: '9876543210fedcba0987654321fedcba0987654321fedcba0987654321fedcba',
            amount: 0.75,
            address: 'ASoLXNKkFGPpZRMXi2HwM6PYkZ8sV9QwkM',
            type: 'send' as const,
            timestamp: new Date(Date.now() - 172800000), // 2 days ago
            confirmations: 25,
            blockHeight: 123440
        },
        {
            txid: 'aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899',
            amount: 2.25,
            address: 'ARdLZNAkFGQhZEMXi2HwM6PYkZ8sV9QwkL',
            type: 'receive' as const,
            timestamp: new Date(Date.now() - 604800000), // 1 week ago
            confirmations: 156,
            blockHeight: 122890
        },
        {
            txid: '112233445566778899aabbccddeeff00112233445566778899aabbccddeeff00',
            amount: 0.001,
            address: 'AXfLMNBkFGWhZJMXi2HwM6PYkZ8sV9QwkP',
            type: 'send' as const,
            timestamp: new Date(Date.now() - 3600000), // 1 hour ago
            confirmations: 3,
            blockHeight: 123460
        },
        {
            txid: 'ffeeaddccbbeeff00112233445566778899aabbccddeeff00112233445566778',
            amount: 0.1,
            address: 'APlKJNBkFGRhZJMXi2HwM6PYkZ8sV9QwkO',
            type: 'receive' as const,
            timestamp: new Date(Date.now() - 1800000), // 30 minutes ago
            confirmations: 0, // Pending transaction
            blockHeight: undefined
        }
    ]
    for (const tx of sampleTransactions) {
        await StorageService.saveTransaction({
            ...tx,
            address: walletAddress // Use the actual wallet address for filtering
        })
    }
}

export async function clearAllTransactions() {
    try {
        await StorageService.clearTransactionHistory()
    } catch (error) {
        console.error('Failed to clear transactions:', error)
    }
}
