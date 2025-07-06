'use client'

import { AlertTriangle, X } from 'lucide-react'

interface ConfirmationModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    title: string
    message: string
    warningText?: string
    confirmText?: string
    cancelText?: string
    isDestructive?: boolean
}

export default function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    warningText,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    isDestructive = false
}: ConfirmationModalProps) {
    if (!isOpen) return null

    const handleConfirm = () => {
        onConfirm()
        onClose()
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
                <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                        <AlertTriangle className={`w-5 h-5 mr-2 ${isDestructive ? 'text-red-600' : 'text-yellow-600'}`} />
                        {title}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="p-6">
                    {warningText && (
                        <div className={`mb-4 p-4 rounded-lg border ${isDestructive
                            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
                            : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200'
                            }`}>
                            <div className="flex">
                                <AlertTriangle className={`w-5 h-5 mr-2 mt-0.5 flex-shrink-0 ${isDestructive ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'}`} />
                                <div className="text-sm font-medium">
                                    {warningText}
                                </div>
                            </div>
                        </div>
                    )}

                    <p className="text-gray-700 dark:text-gray-300 mb-6">
                        {message}
                    </p>

                    <div className="flex space-x-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={handleConfirm}
                            className={`flex-1 px-4 py-2 rounded-lg transition-colors ${isDestructive
                                ? 'bg-red-600 hover:bg-red-700 text-white'
                                : 'bg-avian-600 hover:bg-avian-700 text-white'
                                }`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
