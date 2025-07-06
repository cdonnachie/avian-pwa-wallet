/**
 * Crypto utilities with dynamic imports to avoid SSR issues
 */

let cryptoLibs: any = null

// Initialize all crypto libraries dynamically
export const initializeCrypto = async () => {
    if (typeof window === 'undefined') {
        // Server-side: return null
        return null
    }

    if (cryptoLibs) {
        return cryptoLibs
    }

    try {
        const [
            bitcoinModule,
            ecpairModule,
            eccModule,
            bip39Module,
            bip32Module,
            bs58checkModule
        ] = await Promise.all([
            import('bitcoinjs-lib'),
            import('ecpair'),
            import('tiny-secp256k1'),
            import('bip39'),
            import('bip32'),
            import('bs58check')
        ])

        cryptoLibs = {
            bitcoin: bitcoinModule,
            ECPairFactory: ecpairModule.ECPairFactory,
            ecc: eccModule,
            bip39: bip39Module,
            BIP32Factory: bip32Module.BIP32Factory,
            bs58check: bs58checkModule.default || bs58checkModule
        }

        // Initialize ECPair and BIP32 with ecc
        cryptoLibs.ECPair = cryptoLibs.ECPairFactory(cryptoLibs.ecc)
        cryptoLibs.bip32 = cryptoLibs.BIP32Factory(cryptoLibs.ecc)

        return cryptoLibs
    } catch (error) {
        console.error('Failed to load crypto libraries:', error)
        throw new Error('Failed to initialize cryptographic libraries')
    }
}

// Avian network configuration
export const getAvianNetwork = () => ({
    messagePrefix: '\x19Avian Signed Message:\n',
    bech32: '', // Avian doesn't use bech32
    bip32: {
        public: 0x0488b21e,
        private: 0x0488ade4,
    },
    pubKeyHash: 0x3c, // Avian addresses start with 'R' (decimal 60)
    scriptHash: 0x7a, // Avian script addresses start with 'r' (decimal 122)
    wif: 0x80, // WIF version byte (decimal 128)
})

// Helper to get initialized crypto libraries
export const getCrypto = async () => {
    const libs = await initializeCrypto()
    if (!libs) {
        throw new Error('Crypto libraries not available on server side')
    }
    return libs
}
