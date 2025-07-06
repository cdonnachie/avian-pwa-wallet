interface UTXO {
    txid: string
    vout: number
    value: number
    height?: number
}

interface BalanceResponse {
    confirmed: number
    unconfirmed: number
}

interface ElectrumServer {
    host: string
    port: number
    protocol: 'wss' | 'ws' | 'tcp'
    region?: string
}

interface ElectrumRequest {
    id: number
    method: string
    params: any[]
}

interface ElectrumResponse {
    id: number
    result?: any
    error?: {
        code: number
        message: string
    }
}

interface ElectrumNotification {
    method: string
    params: any[]
}

import * as bitcoin from 'bitcoinjs-lib'

// Avian network configuration (same as in WalletService)
const avianNetwork: bitcoin.Network = {
    messagePrefix: '\x19Raven Signed Message:\n',
    bech32: 'avn',
    bip32: {
        public: 0x0488b21e,
        private: 0x0488ade4,
    },
    pubKeyHash: 0x3c, // Avian addresses start with 'R'
    scriptHash: 0x7a,
    wif: 0x80,
}

export class ElectrumService {
    private servers: ElectrumServer[]
    private currentServer: ElectrumServer | null = null
    private websocket: WebSocket | null = null
    private isConnected: boolean = false
    private isConnecting: boolean = false
    private requestId: number = 0
    private pendingRequests: Map<number, { resolve: (value: any) => void; reject: (reason: any) => void }> = new Map()
    private subscriptions: Map<string, (data: any) => void> = new Map()
    private realBalanceCache: Map<string, number> = new Map() // Cache real balances from subscriptions
    private reconnectAttempts: number = 0
    private maxReconnectAttempts: number = 5
    private reconnectTimeout: NodeJS.Timeout | null = null

    constructor() {
        // Array of Avian ElectrumX servers
        this.servers = [
            { host: 'electrum-us.avn.network', port: 50003, protocol: 'wss', region: 'US' },
            { host: 'electrum-eu.avn.network', port: 50003, protocol: 'wss', region: 'EU' },
            { host: 'electrum-ca.avn.network', port: 50003, protocol: 'wss', region: 'CA' },
        ]

        // Select the first server as default
        this.currentServer = this.servers[0]
    }

    async connect(): Promise<void> {
        try {
            if (!this.currentServer) {
                throw new Error('No server selected')
            }

            // Don't attempt to connect if already connected or connecting
            if (this.isConnected && this.websocket) {

                return
            }

            if (this.isConnecting) {

                return
            }

            // Set connecting state
            this.isConnecting = true

            // Clean up any existing connection
            if (this.websocket) {
                this.websocket.close()
                this.websocket = null
            }

            const url = `${this.currentServer.protocol}://${this.currentServer.host}:${this.currentServer.port}`


            return new Promise((resolve, reject) => {
                this.websocket = new WebSocket(url)

                this.websocket.onopen = () => {
                    this.isConnected = true
                    this.isConnecting = false
                    this.reconnectAttempts = 0

                    resolve()
                }

                this.websocket.onclose = (event) => {
                    this.isConnected = false
                    this.isConnecting = false


                    // Attempt to reconnect if not manually closed and not already reconnecting
                    if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts && !this.isConnecting) {
                        this.attemptReconnect()
                    }
                }

                this.websocket.onerror = (error) => {
                    console.error('WebSocket error:', error)
                    this.isConnected = false
                    this.isConnecting = false
                    reject(new Error('WebSocket connection failed'))
                }

                this.websocket.onmessage = (event) => {
                    this.handleMessage(event.data)
                }

                // Connection timeout
                setTimeout(() => {
                    if (!this.isConnected && this.isConnecting) {
                        this.isConnecting = false
                        this.websocket?.close()
                        reject(new Error('Connection timeout'))
                    }
                }, 10000) // 10 second timeout
            })
        } catch (error) {
            this.isConnecting = false
            console.error('Failed to connect to Electrum server:', error)
            throw new Error('Connection failed')
        }
    }

    private attemptReconnect(): void {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout)
        }

        this.reconnectAttempts++
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000) // Exponential backoff, max 30s



        this.reconnectTimeout = setTimeout(() => {
            this.connect().catch((error) => {
                console.error('Reconnection failed:', error)
                if (this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.attemptReconnect()
                }
            })
        }, delay)
    }

    private handleMessage(data: string): void {
        try {
            const message = JSON.parse(data)

            // Handle responses to requests
            if (message.id !== undefined) {
                const pending = this.pendingRequests.get(message.id)
                if (pending) {
                    this.pendingRequests.delete(message.id)

                    if (message.error) {
                        pending.reject(new Error(`ElectrumX error ${message.error.code}: ${message.error.message}`))
                    } else {
                        pending.resolve(message.result)
                    }
                }
            }
            // Handle notifications (subscriptions)
            else if (message.method) {
                this.handleNotification(message)
            }
        } catch (error) {
            console.error('Error parsing WebSocket message:', error)
        }
    }

    private handleNotification(notification: ElectrumNotification): void {


        if (notification.method === 'blockchain.scripthash.subscribe') {
            const [scripthash, status] = notification.params
            const callback = this.subscriptions.get(scripthash)

            if (callback) {
                callback({
                    scripthash,
                    status,
                    method: notification.method
                })
            }
        }
    }

    // Get list of available servers
    getAvailableServers(): ElectrumServer[] {
        return this.servers
    }

    // Get current server
    getCurrentServer(): ElectrumServer | null {
        return this.currentServer
    }

    // Select server by index
    selectServer(index: number): void {
        if (index >= 0 && index < this.servers.length) {
            this.currentServer = this.servers[index]
            this.disconnect() // Disconnect from current server
        } else {
            throw new Error('Invalid server index')
        }
    }

    // Select server by host
    selectServerByHost(host: string): void {
        const server = this.servers.find(s => s.host === host)
        if (server) {
            this.currentServer = server
            this.disconnect() // Disconnect from current server
        } else {
            throw new Error(`Server not found: ${host}`)
        }
    }

    // Auto-select best server (for future implementation)
    async selectBestServer(): Promise<void> {
        try {
            // For now, just select the first server
            // In production, implement ping/latency testing
            this.currentServer = this.servers[0]

        } catch (error) {
            console.error('Failed to auto-select server:', error)
            throw error
        }
    }

    // Get server URL for display
    getServerUrl(): string {
        if (!this.currentServer) return 'No server selected'
        return `${this.currentServer.protocol}://${this.currentServer.host}:${this.currentServer.port}`
    }

    async getBalance(address: string): Promise<number> {
        try {
            // First check if we have real balance data from subscriptions
            const cachedBalance = this.realBalanceCache.get(address)
            if (cachedBalance !== undefined) {

                return cachedBalance
            }

            // Convert address to script hash for Electrum protocol
            const scriptHash = this.addressToScriptHash(address)

            // Make real request to ElectrumX server
            const response = await this.makeRequest('blockchain.scripthash.get_balance', [scriptHash])

            const totalBalance = response.confirmed + response.unconfirmed


            // Update cache with real balance
            this.realBalanceCache.set(address, totalBalance)

            return totalBalance
        } catch (error) {
            console.error('Failed to get balance:', error)
            // Return cached balance if available
            const cachedBalance = this.realBalanceCache.get(address)
            if (cachedBalance !== undefined) {
                return cachedBalance
            }

            // Last resort: check localStorage for persisted balance
            const storedBalance = localStorage.getItem('avian_wallet_last_balance')
            return storedBalance ? parseInt(storedBalance, 10) : 0
        }
    }

    async getUTXOs(address: string): Promise<UTXO[]> {
        try {
            const scriptHash = this.addressToScriptHash(address)
            const response = await this.makeRequest('blockchain.scripthash.listunspent', [scriptHash])

            return response.map((utxo: any) => ({
                txid: utxo.tx_hash,
                vout: utxo.tx_pos,
                value: utxo.value,
                height: utxo.height
            }))
        } catch (error) {
            console.error('Failed to get UTXOs:', error)
            return []
        }
    }

    async broadcastTransaction(txHex: string): Promise<string> {
        try {
            const response = await this.makeRequest('blockchain.transaction.broadcast', [txHex])

            return response
        } catch (error) {
            console.error('Failed to broadcast transaction:', error)
            throw new Error(`Transaction broadcast failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    async getTransactionHistory(address: string): Promise<any[]> {
        try {
            const scriptHash = this.addressToScriptHash(address)
            const response = await this.makeRequest('blockchain.scripthash.get_history', [scriptHash])

            return response
        } catch (error) {
            console.error('Failed to get transaction history:', error)
            return []
        }
    }

    async getTransaction(txHash: string, verbose: boolean = false): Promise<any> {
        try {
            const response = await this.makeRequest('blockchain.transaction.get', [txHash, verbose])
            return response
        } catch (error) {
            console.error('Failed to get transaction:', error)
            throw error
        }
    }

    async getServerVersion(): Promise<{ server: string; protocol: string }> {
        try {
            const response = await this.makeRequest('server.version', ['Avian PWA Wallet 1.0', '1.4'])
            return response
        } catch (error) {
            console.error('Failed to get server version:', error)
            throw error
        }
    }

    async ping(): Promise<void> {
        try {
            await this.makeRequest('server.ping', [])
        } catch (error) {
            console.error('Failed to ping server:', error)
            throw error
        }
    }

    async getCurrentBlockHeight(): Promise<number> {
        try {
            const result = await this.makeRequest('blockchain.headers.subscribe', [])
            return result.height
        } catch (error) {
            console.error('Failed to get current block height:', error)
            // Fallback: try alternative method
            try {
                const estimateResult = await this.makeRequest('blockchain.estimatefee', [1])
                // If estimatefee works, try to get block count
                const blockCount = await this.makeRequest('blockchain.block.headers', [0, 1])
                if (blockCount && blockCount.count) {
                    return blockCount.count
                }
            } catch (fallbackError) {
                console.error('Fallback method also failed:', fallbackError)
            }
            // Return 0 if we can't get the height
            return 0
        }
    }

    // Method to update real balance from external sources (like subscription updates)
    updateRealBalance(address: string, balance: number): void {

        this.realBalanceCache.set(address, balance)
    }

    // Method to check if we have real balance data
    hasRealBalance(address: string): boolean {
        return this.realBalanceCache.has(address)
    }

    private addressToScriptHash(address: string): string {
        try {
            // Convert Avian address to output script
            const outputScript = bitcoin.address.toOutputScript(address, avianNetwork)

            // Calculate SHA256 hash of the output script
            const hash = bitcoin.crypto.sha256(outputScript)

            // Reverse the hash bytes (ElectrumX protocol requirement)
            const reversed = Buffer.from(hash).reverse()

            // Convert to hex string
            const scriptHash = reversed.toString('hex')


            return scriptHash
        } catch (error) {
            console.error('Error converting address to script hash:', error)
            // Fallback to a deterministic hash for development
            const fallbackHash = bitcoin.crypto.sha256(Buffer.from(address, 'utf8'))
            return Buffer.from(fallbackHash).reverse().toString('hex')
        }
    }

    private async makeRequest(method: string, params: any[]): Promise<any> {
        if (!this.isConnected || !this.websocket) {
            throw new Error('Not connected to Electrum server')
        }

        const id = ++this.requestId
        const request: ElectrumRequest = { id, method, params }

        return new Promise((resolve, reject) => {
            // Store the pending request
            this.pendingRequests.set(id, { resolve, reject })

            // Send the request
            this.websocket!.send(JSON.stringify(request))


            // Set timeout for the request
            setTimeout(() => {
                if (this.pendingRequests.has(id)) {
                    this.pendingRequests.delete(id)
                    reject(new Error(`Request timeout: ${method}`))
                }
            }, 30000) // 30 second timeout
        })
    }

    async subscribeToAddress(address: string, callback: (data: any) => void): Promise<void> {
        try {
            const scriptHash = this.addressToScriptHash(address)

            // Store the subscription callback
            this.subscriptions.set(scriptHash, callback)

            // Send subscription request to ElectrumX server
            const initialStatus = await this.makeRequest('blockchain.scripthash.subscribe', [scriptHash])


            // Call the callback with initial status
            callback({
                scripthash: scriptHash,
                status: initialStatus,
                method: 'blockchain.scripthash.subscribe'
            })

        } catch (error) {
            console.error('Failed to subscribe to address:', error)
            throw error
        }
    }

    async unsubscribeFromAddress(address: string): Promise<void> {
        try {
            const scriptHash = this.addressToScriptHash(address)

            // Remove from local subscriptions
            this.subscriptions.delete(scriptHash)

            // Send unsubscribe request to server
            await this.makeRequest('blockchain.scripthash.unsubscribe', [scriptHash])

        } catch (error) {
            console.error('Failed to unsubscribe from address:', error)
            throw error
        }
    }

    async disconnect(): Promise<void> {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout)
            this.reconnectTimeout = null
        }

        if (this.websocket) {
            this.websocket.close(1000, 'User disconnect') // Normal closure
            this.websocket = null
        }

        this.isConnected = false
        this.isConnecting = false
        this.pendingRequests.clear()
        this.subscriptions.clear()
        this.reconnectAttempts = 0


    }

    isConnectedToServer(): boolean {
        return this.isConnected
    }
}
