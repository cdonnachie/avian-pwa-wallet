'use client'

import { useState, useEffect } from 'react'
import { QrCode, Copy, CheckCircle } from 'lucide-react'
import QRCodeLib from 'qrcode'
import { useToast } from '@/components/Toast'

interface ReceiveContentProps {
    address: string
}

export default function ReceiveContent({ address }: ReceiveContentProps) {
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('')
    const [copied, setCopied] = useState(false)
    const { showToast } = useToast()

    useEffect(() => {
        const generateQRCode = async () => {
            if (address) {
                try {
                    const qrCodeDataUrl = await QRCodeLib.toDataURL(address, {
                        width: 300,
                        margin: 2,
                        color: {
                            dark: '#1f2937',
                            light: '#ffffff'
                        }
                    })
                    setQrCodeDataUrl(qrCodeDataUrl)
                } catch (error) {
                    console.error('Error generating QR code:', error)
                }
            }
        }

        generateQRCode()
    }, [address])

    const copyToClipboard = async () => {
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

    if (!address) {
        return (
            <div className="p-6 text-center">
                <div className="text-gray-500 dark:text-gray-400 mb-4">
                    No wallet address available
                </div>
            </div>
        )
    }

    return (
        <div className="p-6">
            {/* Header */}
            <div className="text-center mb-6">
                <div className="flex justify-center items-center mb-3">
                    <QrCode className="w-6 h-6 text-avian-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Receive AVN
                </h2>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4">
                    <div className="flex items-center justify-center">
                        <div className="text-yellow-600 dark:text-yellow-400 text-sm">
                            ⚠️ Do not keep large amounts in your wallet
                        </div>
                    </div>
                </div>
            </div>

            {/* QR Code */}
            <div className="flex justify-center mb-6">
                <div className="bg-white p-3 rounded-lg shadow-sm">
                    {qrCodeDataUrl ? (
                        <img
                            src={qrCodeDataUrl}
                            alt="Wallet Address QR Code"
                            className="w-48 h-48 sm:w-56 sm:h-56"
                        />
                    ) : (
                        <div className="w-48 h-48 sm:w-56 sm:h-56 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                            <div className="text-gray-500 dark:text-gray-400 text-sm">
                                Generating QR Code...
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Address */}
            <div className="mb-6">
                <h3 className="text-base font-medium text-gray-900 dark:text-white mb-3 text-center">
                    Your Avian Address
                </h3>
                <div className="flex items-center bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                    <div className="flex-1 text-sm font-mono text-gray-700 dark:text-gray-300 break-all">
                        {address}
                    </div>
                    <button
                        onClick={copyToClipboard}
                        className="ml-3 p-2 rounded-md bg-avian-600 hover:bg-avian-700 text-white transition-colors flex-shrink-0"
                        title={copied ? "Copied!" : "Copy address"}
                    >
                        {copied ? (
                            <CheckCircle className="w-4 h-4" />
                        ) : (
                            <Copy className="w-4 h-4" />
                        )}
                    </button>
                </div>
            </div>

            {/* Instructions */}
            <div className="text-center text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <p>Share this address to receive AVN payments</p>
                <p>Each transaction will be visible on the blockchain</p>
            </div>
        </div>
    )
}
