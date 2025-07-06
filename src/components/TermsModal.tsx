'use client'

import { useState, useEffect } from 'react'
import { Shield, AlertTriangle, Check, X } from 'lucide-react'

interface TermsModalProps {
    isOpen: boolean
    onAccept: () => void
    onDecline: () => void
}

export default function TermsModal({ isOpen, onAccept, onDecline }: TermsModalProps) {
    const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false)
    const [acceptanceChoice, setAcceptanceChoice] = useState<'accept' | 'decline' | null>(null)
    const [showDeclineMessage, setShowDeclineMessage] = useState(false)

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
        const isScrolledToBottom = scrollTop + clientHeight >= scrollHeight - 10
        setHasScrolledToBottom(isScrolledToBottom)
    }

    const handleAccept = () => {
        if (acceptanceChoice === 'accept' && hasScrolledToBottom) {
            onAccept()
        }
    }

    const handleDecline = () => {
        setShowDeclineMessage(true)
        // Don't call onDecline() to avoid browser alert
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100] p-2 sm:p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full max-h-[98vh] sm:max-h-[95vh] overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-avian-500 to-avian-600 flex-shrink-0">
                    <div className="flex items-center space-x-3">
                        <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                        <div>
                            <h2 className="text-lg sm:text-xl font-bold text-white">AVIAN WALLET</h2>
                            <p className="text-avian-100 text-xs sm:text-sm">Terms of Use Agreement</p>
                        </div>
                    </div>
                </div>

                {/* Notice - Condensed */}
                <div className="p-3 sm:p-4 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-700 flex-shrink-0">
                    <div className="flex items-start space-x-2 sm:space-x-3">
                        <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                        <div>
                            <h3 className="text-sm sm:text-base font-semibold text-yellow-800 dark:text-yellow-200">Important Notice</h3>
                            <p className="text-xs sm:text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                                MIT License. Please read and accept the terms below to continue.
                            </p>
                        </div>
                    </div>
                </div>

                {/* License Content - Flexible height */}
                <div className="p-3 sm:p-6 flex-1 overflow-hidden min-h-0">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">License Agreement</h3>

                    <div
                        className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 sm:p-6 h-48 sm:h-64 md:h-72 overflow-y-auto border border-gray-200 dark:border-gray-700 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200"
                        onScroll={handleScroll}
                    >
                        <div className="space-y-3 sm:space-y-4 text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                            <div>
                                <h4 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">MIT License</h4>
                                <p className="mt-1 sm:mt-2 text-gray-600 dark:text-gray-400">Copyright (c) 2024 The Avian Developers</p>
                            </div>

                            <p>
                                Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
                                associated documentation files (the &quot;Software&quot;), to deal in the Software without restriction, including
                                without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
                                of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following
                                conditions:
                            </p>

                            <p>
                                The above copyright notice and this permission notice shall be included in all copies or substantial portions
                                of the Software.
                            </p>

                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3 sm:p-4">
                                <h5 className="font-semibold text-red-800 dark:text-red-200 mb-1 sm:mb-2 text-xs sm:text-sm">Warranty Disclaimer</h5>
                                <p className="text-red-800 dark:text-red-200 font-medium text-xs sm:text-sm">
                                    THE SOFTWARE IS PROVIDED &quot;AS IS&quot;, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
                                    INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
                                    PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
                                    LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT
                                    OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
                                    OTHER DEALINGS IN THE SOFTWARE.
                                </p>
                            </div>

                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3 sm:p-4">
                                <h5 className="font-semibold text-blue-800 dark:text-blue-200 mb-1 sm:mb-2 text-xs sm:text-sm">Security Notice</h5>
                                <p className="text-blue-700 dark:text-blue-300 mb-1 sm:mb-2 text-xs sm:text-sm">
                                    This wallet software stores private keys locally on your device. You are responsible for:
                                </p>
                                <ul className="list-disc list-inside text-blue-700 dark:text-blue-300 space-y-0.5 sm:space-y-1 text-xs sm:text-sm">
                                    <li>Keeping your private keys and mnemonic phrases secure</li>
                                    <li>Making regular backups of your wallet data</li>
                                    <li>Using strong passwords and enabling security features</li>
                                    <li>Understanding the risks of cryptocurrency transactions</li>
                                </ul>
                            </div>

                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3 sm:p-4">
                                <h5 className="font-semibold text-amber-800 dark:text-amber-200 mb-1 sm:mb-2 text-xs sm:text-sm">Cryptocurrency Risks</h5>
                                <p className="text-amber-700 dark:text-amber-300 text-xs sm:text-sm">
                                    Cryptocurrency transactions are irreversible. Lost private keys cannot be recovered.
                                    The value of cryptocurrencies can be volatile. Only invest what you can afford to lose.
                                    Always verify recipient addresses before sending transactions.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Scroll indicator */}
                    {!hasScrolledToBottom && (
                        <div className="mt-2 sm:mt-3 text-center">
                            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 animate-pulse">
                                ↓ Please scroll to the bottom to continue ↓
                            </p>
                        </div>
                    )}

                    {/* Decline message */}
                    {showDeclineMessage && (
                        <div className="mt-3 p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
                            <div className="flex items-start space-x-2 sm:space-x-3">
                                <X className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                                <div>
                                    <h4 className="text-sm sm:text-base font-semibold text-red-800 dark:text-red-200">Terms Required</h4>
                                    <p className="text-xs sm:text-sm text-red-700 dark:text-red-300 mt-1">
                                        You must accept the terms to use Avian Wallet. Please close this window if you do not wish to continue.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Acceptance Section - Compact */}
                <div className="px-3 sm:px-6 py-3 sm:py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <div className="space-y-2 sm:space-y-3">
                        <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                            Do you accept the terms of this License Agreement?
                        </p>

                        <div className="space-y-1 sm:space-y-2">
                            <label className="flex items-center space-x-2 sm:space-x-3 cursor-pointer p-2 sm:p-3 rounded-lg border border-transparent hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                <input
                                    type="radio"
                                    name="termsAcceptance"
                                    value="accept"
                                    checked={acceptanceChoice === 'accept'}
                                    onChange={(e) => {
                                        setAcceptanceChoice(e.target.value as 'accept')
                                        setShowDeclineMessage(false)
                                    }}
                                    disabled={!hasScrolledToBottom}
                                    className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 focus:ring-green-500 focus:ring-2 disabled:opacity-50"
                                />
                                <span className={`text-xs sm:text-sm font-medium ${hasScrolledToBottom
                                    ? 'text-green-700 dark:text-green-400'
                                    : 'text-gray-400 dark:text-gray-500'
                                    }`}>
                                    ✓ I accept the terms of the License Agreement
                                </span>
                            </label>

                            <label className="flex items-center space-x-2 sm:space-x-3 cursor-pointer p-2 sm:p-3 rounded-lg border border-transparent hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                <input
                                    type="radio"
                                    name="termsAcceptance"
                                    value="decline"
                                    checked={acceptanceChoice === 'decline'}
                                    onChange={(e) => setAcceptanceChoice(e.target.value as 'decline')}
                                    className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 focus:ring-red-500 focus:ring-2"
                                />
                                <span className="text-xs sm:text-sm font-medium text-red-700 dark:text-red-400">
                                    ✗ I do not accept the terms of the License Agreement
                                </span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Action Buttons - Always visible */}
                <div className="flex justify-end space-x-2 sm:space-x-3 p-3 sm:p-6 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 flex-shrink-0">
                    <button
                        onClick={handleDecline}
                        className="px-4 sm:px-6 py-2 sm:py-2.5 text-sm sm:text-base text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-500 transition-colors flex items-center space-x-1 sm:space-x-2 font-medium"
                    >
                        <X className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span>Exit</span>
                    </button>

                    <button
                        onClick={handleAccept}
                        disabled={acceptanceChoice !== 'accept' || !hasScrolledToBottom}
                        className="px-4 sm:px-6 py-2 sm:py-2.5 text-sm sm:text-base bg-avian-600 hover:bg-avian-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center space-x-1 sm:space-x-2 font-medium disabled:opacity-50"
                    >
                        <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span>Continue</span>
                    </button>
                </div>
            </div>
        </div>
    )
}
