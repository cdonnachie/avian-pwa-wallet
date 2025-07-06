/**
 * Multi-wallet functionality test utility
 * 
 * This file provides functions to test the multi-wallet implementation
 */

import { StorageService } from '@/services/StorageService'
import { WalletService } from '@/services/WalletService'

export interface TestResult {
    success: boolean
    message: string
    data?: any
}

export class MultiWalletTester {
    static async testBasicMultiWalletFunctionality(): Promise<TestResult[]> {
        const results: TestResult[] = []

        try {
            // Test 1: Clear all existing data
            await StorageService.clearWallet()
            results.push({
                success: true,
                message: '✅ Cleared existing wallet data'
            })

            // Test 2: Create first wallet
            const wallet1 = await StorageService.createWallet({
                name: 'Test Wallet 1',
                address: 'RTestAddress1234567890',
                privateKey: 'TestPrivateKey1234567890',
                mnemonic: 'test mnemonic phrase for wallet one',
                isEncrypted: false,
                makeActive: true
            })
            results.push({
                success: true,
                message: '✅ Created first wallet',
                data: { id: wallet1.id, name: wallet1.name, isActive: wallet1.isActive }
            })

            // Test 3: Create second wallet
            const wallet2 = await StorageService.createWallet({
                name: 'Test Wallet 2',
                address: 'RTestAddress0987654321',
                privateKey: 'TestPrivateKey0987654321',
                mnemonic: 'another test mnemonic phrase for wallet two',
                isEncrypted: false,
                makeActive: false
            })
            results.push({
                success: true,
                message: '✅ Created second wallet',
                data: { id: wallet2.id, name: wallet2.name, isActive: wallet2.isActive }
            })

            // Test 4: Check wallet count
            const walletCount = await StorageService.getWalletCount()
            results.push({
                success: walletCount === 2,
                message: walletCount === 2 ? '✅ Wallet count correct (2)' : `❌ Expected 2 wallets, got ${walletCount}`,
                data: { count: walletCount }
            })

            // Test 5: Get all wallets
            const allWallets = await StorageService.getAllWallets()
            results.push({
                success: allWallets.length === 2,
                message: allWallets.length === 2 ? '✅ getAllWallets returned 2 wallets' : `❌ Expected 2 wallets, got ${allWallets.length}`,
                data: { wallets: allWallets.map(w => ({ id: w.id, name: w.name, isActive: w.isActive })) }
            })

            // Test 6: Check active wallet
            const activeWallet = await StorageService.getActiveWallet()
            const isActiveCorrect = activeWallet?.id === wallet1.id
            results.push({
                success: isActiveCorrect,
                message: isActiveCorrect ? '✅ Active wallet is correct (wallet1)' : `❌ Expected wallet1 to be active, got ${activeWallet?.name}`,
                data: { activeWallet: activeWallet ? { id: activeWallet.id, name: activeWallet.name } : null }
            })

            // Test 7: Switch to second wallet
            const switchSuccess = await StorageService.switchToWallet(wallet2.id!)
            results.push({
                success: switchSuccess,
                message: switchSuccess ? '✅ Successfully switched to wallet2' : '❌ Failed to switch to wallet2'
            })

            // Test 8: Verify active wallet changed
            const newActiveWallet = await StorageService.getActiveWallet()
            const isSwitchCorrect = newActiveWallet?.id === wallet2.id
            results.push({
                success: isSwitchCorrect,
                message: isSwitchCorrect ? '✅ Active wallet correctly changed to wallet2' : `❌ Expected wallet2 to be active, got ${newActiveWallet?.name}`,
                data: { activeWallet: newActiveWallet ? { id: newActiveWallet.id, name: newActiveWallet.name } : null }
            })

            // Test 9: Test legacy compatibility methods
            const legacyAddress = await StorageService.getAddress()
            const legacyPrivateKey = await StorageService.getPrivateKey()
            const isLegacyCorrect = legacyAddress === wallet2.address && legacyPrivateKey === wallet2.privateKey
            results.push({
                success: isLegacyCorrect,
                message: isLegacyCorrect ? '✅ Legacy methods return active wallet data' : '❌ Legacy methods not working correctly',
                data: { legacyAddress, expectedAddress: wallet2.address }
            })

            // Test 10: Update wallet name
            const updateSuccess = await StorageService.updateWalletName(wallet2.id!, 'Updated Wallet Name')
            results.push({
                success: updateSuccess,
                message: updateSuccess ? '✅ Successfully updated wallet name' : '❌ Failed to update wallet name'
            })

            // Test 11: Verify name update
            const updatedWallet = await StorageService.getWalletById(wallet2.id!)
            const isNameUpdated = updatedWallet?.name === 'Updated Wallet Name'
            results.push({
                success: isNameUpdated,
                message: isNameUpdated ? '✅ Wallet name correctly updated' : `❌ Expected 'Updated Wallet Name', got '${updatedWallet?.name}'`,
                data: { updatedName: updatedWallet?.name }
            })

            // Test 12: Test wallet exists
            const existsTest = await StorageService.walletExists(wallet1.address)
            results.push({
                success: existsTest,
                message: existsTest ? '✅ walletExists correctly returns true for existing wallet' : '❌ walletExists should return true for existing wallet'
            })

            const notExistsTest = await StorageService.walletExists('RNonExistentAddress')
            results.push({
                success: !notExistsTest,
                message: !notExistsTest ? '✅ walletExists correctly returns false for non-existent wallet' : '❌ walletExists should return false for non-existent wallet'
            })

            // Test 13: Delete wallet
            const deleteSuccess = await StorageService.deleteWallet(wallet1.id!)
            results.push({
                success: deleteSuccess,
                message: deleteSuccess ? '✅ Successfully deleted wallet1' : '❌ Failed to delete wallet1'
            })

            // Test 14: Verify wallet count after deletion
            const finalCount = await StorageService.getWalletCount()
            results.push({
                success: finalCount === 1,
                message: finalCount === 1 ? '✅ Wallet count correct after deletion (1)' : `❌ Expected 1 wallet after deletion, got ${finalCount}`,
                data: { finalCount }
            })

        } catch (error) {
            results.push({
                success: false,
                message: `❌ Test failed with error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                data: { error }
            })
        }

        return results
    }

    static async testWalletServiceIntegration(): Promise<TestResult[]> {
        const results: TestResult[] = []

        try {
            const walletService = new WalletService()

            // Test 1: Create new wallet via WalletService
            const wallet1 = await walletService.createNewWallet({
                name: 'Service Test Wallet 1',
                useMnemonic: true,
                makeActive: true
            })
            results.push({
                success: !!wallet1.id,
                message: '✅ Created wallet via WalletService',
                data: { id: wallet1.id, name: wallet1.name, address: wallet1.address }
            })

            // Test 2: Get all wallets via WalletService
            const allWallets = await walletService.getAllWallets()
            results.push({
                success: allWallets.length >= 1,
                message: `✅ WalletService.getAllWallets returned ${allWallets.length} wallets`,
                data: { count: allWallets.length }
            })

            // Test 3: Get active wallet via WalletService
            const activeWallet = await walletService.getActiveWallet()
            results.push({
                success: !!activeWallet && activeWallet.id === wallet1.id,
                message: activeWallet ? '✅ WalletService.getActiveWallet working' : '❌ No active wallet found',
                data: { activeWallet: activeWallet ? { id: activeWallet.id, name: activeWallet.name } : null }
            })

            // Test 4: Get wallet count via WalletService
            const count = await walletService.getWalletCount()
            results.push({
                success: count >= 1,
                message: `✅ WalletService.getWalletCount returned ${count}`,
                data: { count }
            })

        } catch (error) {
            results.push({
                success: false,
                message: `❌ WalletService test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                data: { error }
            })
        }

        return results
    }

    static formatResults(results: TestResult[]): string {
        const passed = results.filter(r => r.success).length
        const total = results.length
        const percentage = Math.round((passed / total) * 100)

        let output = `\n🧪 Multi-Wallet Test Results: ${passed}/${total} passed (${percentage}%)\n`
        output += '═'.repeat(60) + '\n\n'

        results.forEach((result, index) => {
            output += `${index + 1}. ${result.message}\n`
            if (result.data) {
                output += `   Data: ${JSON.stringify(result.data, null, 2)}\n`
            }
            output += '\n'
        })

        return output
    }

    static async runAllTests(): Promise<string> {
        const basicTests = await this.testBasicMultiWalletFunctionality()
        const serviceTests = await this.testWalletServiceIntegration()

        const allResults = [...basicTests, ...serviceTests]
        const report = this.formatResults(allResults)
        return report
    }
}

// Export for easy console testing
if (typeof window !== 'undefined') {
    (window as any).MultiWalletTester = MultiWalletTester
}
