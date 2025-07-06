'use client'

import { useState, useEffect } from 'react'
import { QrCode, X, Copy, CheckCircle } from 'lucide-react'
import QRCodeLib from 'qrcode'
import { useToast } from '@/components/Toast'

interface ReceiveModalProps {
    address: string
    onClose: () => void
}

export default function ReceiveModal({ address, onClose }: ReceiveModalProps) {
    const [qrCodeUrl, setQrCodeUrl] = useState<string>('')
    const [copied, setCopied] = useState(false)
    const { showToast } = useToast()

    const generateQRCode = async () => {
        try {
            const url = await QRCodeLib.toDataURL(address, {
                width: 256,
                margin: 2,
                color: {
                    dark: '#2a737f', // avian-primary - main Avian brand color
                    light: '#ffffff'
                }
            })
            setQrCodeUrl(url)
        } catch (error) {
            console.error('Failed to generate QR code:', error)
        }
    }

    useEffect(() => {
        if (address) {
            generateQRCode()
        }
    }, [address]) // eslint-disable-line react-hooks/exhaustive-deps

    const copyAddress = async () => {
        try {
            await navigator.clipboard.writeText(address)
            showToast({
                type: 'success',
                title: 'Address copied!',
                message: 'Avian address copied to clipboard'
            })
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (error) {
            console.error('Failed to copy address:', error)
        }
    }

    const formatAddress = (addr: string) => {
        if (!addr) return ''
        return addr.length > 20
            ? `${addr.slice(0, 10)}...${addr.slice(-10)}`
            : addr
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-sm w-full mx-4">
                <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                        <QrCode className="w-5 h-5 mr-2 text-avian-600" />
                        Receive AVN
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="p-6 text-center">
                    <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 rounded-lg text-yellow-800 text-sm">
                        ⚠️ Do not keep large amounts in your wallet
                    </div>

                    {qrCodeUrl && (
                        <div className="mb-6 flex justify-center">
                            <img
                                src={qrCodeUrl}
                                alt="Wallet Address QR Code"
                                className="rounded-lg shadow-md"
                            />
                        </div>
                    )}

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Your Avian Address
                        </label>
                        <div className="flex items-center space-x-2">
                            <div className="flex-1 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg border text-sm font-mono break-all text-gray-900 dark:text-gray-100">
                                {address || 'No address available'}
                            </div>
                            <button
                                onClick={copyAddress}
                                className="p-2 bg-avian-600 hover:bg-avian-700 text-white rounded-lg transition-colors"
                                title="Copy address"
                            >
                                {copied ? (
                                    <CheckCircle className="w-4 h-4" />
                                ) : (
                                    <Copy className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                        {copied && (
                            <p className="text-xs text-green-600 mt-1">Address copied!</p>
                        )}
                    </div>

                    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                        <p>Share this address to receive AVN payments</p>
                        <p>Each transaction will be visible on the blockchain</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
