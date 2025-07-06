import React, { useState } from 'react'
import { CoinSelectionStrategy } from '@/services/UTXOSelectionService'
import { Settings, Info, Zap, Shield, Layers, Target, Coins, UserCheck } from 'lucide-react'

interface UTXOSelectionSettingsProps {
    isOpen: boolean
    onClose: () => void
    onApply: (options: {
        strategy: CoinSelectionStrategy
        feeRate?: number
        maxInputs?: number
        minConfirmations?: number
    }) => void
    currentOptions?: {
        strategy?: CoinSelectionStrategy
        feeRate?: number
        maxInputs?: number
        minConfirmations?: number
    }
}

export function UTXOSelectionSettings({
    isOpen,
    onClose,
    onApply,
    currentOptions = {}
}: UTXOSelectionSettingsProps) {
    const [strategy, setStrategy] = useState<CoinSelectionStrategy>(
        currentOptions.strategy || CoinSelectionStrategy.BEST_FIT
    )
    const [feeRate, setFeeRate] = useState(currentOptions.feeRate || 10000)
    const [maxInputs, setMaxInputs] = useState(currentOptions.maxInputs || 20)
    const [minConfirmations, setMinConfirmations] = useState(currentOptions.minConfirmations || 0)

    if (!isOpen) return null

    const strategies = [
        {
            value: CoinSelectionStrategy.BEST_FIT,
            name: 'Best Fit',
            description: 'Optimal balance of efficiency and fees',
            icon: <Target className="w-4 h-4" />,
            recommended: true
        },
        {
            value: CoinSelectionStrategy.SMALLEST_FIRST,
            name: 'Minimize Fees',
            description: 'Select smallest UTXOs first to reduce transaction size',
            icon: <Zap className="w-4 h-4" />
        },
        {
            value: CoinSelectionStrategy.LARGEST_FIRST,
            name: 'Fewer Inputs',
            description: 'Use larger UTXOs for simpler transactions',
            icon: <Layers className="w-4 h-4" />
        },
        {
            value: CoinSelectionStrategy.PRIVACY_FOCUSED,
            name: 'Privacy Enhanced',
            description: 'Use multiple inputs for better privacy',
            icon: <Shield className="w-4 h-4" />
        },
        {
            value: CoinSelectionStrategy.CONSOLIDATE_DUST,
            name: 'Consolidate Dust',
            description: 'Include small UTXOs to clean up wallet',
            icon: <Coins className="w-4 h-4" />
        }
    ]

    const handleApply = () => {
        onApply({
            strategy,
            feeRate,
            maxInputs,
            minConfirmations
        })
        onClose()
    }

    const handleReset = () => {
        setStrategy(CoinSelectionStrategy.BEST_FIT)
        setFeeRate(10000)
        setMaxInputs(20)
        setMinConfirmations(0)
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                        <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Transaction Settings
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Strategy Selection */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                                UTXO Selection Strategy
                            </h3>
                            <div className="group relative">
                                <Info className="w-4 h-4 text-gray-400 cursor-help" />
                                <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                                    How your transaction inputs are selected
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            {strategies.map((s) => (
                                <label
                                    key={s.value}
                                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${strategy === s.value
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        name="strategy"
                                        value={s.value}
                                        checked={strategy === s.value}
                                        onChange={(e) => setStrategy(e.target.value as CoinSelectionStrategy)}
                                        className="mt-1"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            {s.icon}
                                            <span className="font-medium text-gray-900 dark:text-white">
                                                {s.name}
                                            </span>
                                            {s.recommended && (
                                                <span className="text-xs bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded">
                                                    Recommended
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                            {s.description}
                                        </p>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Advanced Settings */}
                    <div>
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                            Advanced Settings
                        </h3>
                        <div className="space-y-4">
                            {/* Fee Rate */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Network Fee (satoshis)
                                </label>
                                <input
                                    type="number"
                                    value={feeRate}
                                    onChange={(e) => setFeeRate(parseInt(e.target.value) || 10000)}
                                    min="1000"
                                    max="100000"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                                             focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Default: 10,000 sats (0.0001 AVN)
                                </p>
                            </div>

                            {/* Max Inputs */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Maximum Inputs
                                </label>
                                <input
                                    type="number"
                                    value={maxInputs}
                                    onChange={(e) => setMaxInputs(parseInt(e.target.value) || 20)}
                                    min="1"
                                    max="100"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                                             focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Limit the number of UTXOs used in the transaction
                                </p>
                            </div>

                            {/* Min Confirmations */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Minimum Confirmations
                                </label>
                                <input
                                    type="number"
                                    value={minConfirmations}
                                    onChange={(e) => setMinConfirmations(parseInt(e.target.value) || 0)}
                                    min="0"
                                    max="10"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                                             focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Only use UTXOs with this many confirmations or more
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
                    <button
                        onClick={handleReset}
                        className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 
                                 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        Reset to Defaults
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 
                                 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleApply}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Apply Settings
                    </button>
                </div>
            </div>
        </div>
    )
}
