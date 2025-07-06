'use client'

import React, { useState, useEffect } from 'react'
import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react'

export interface Toast {
    id: string
    type: 'success' | 'error' | 'warning' | 'info'
    title: string
    message?: string
    duration?: number
}

interface ToastProviderProps {
    children: React.ReactNode
}

interface ToastContextType {
    showToast: (toast: Omit<Toast, 'id'>) => void
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: ToastProviderProps) {
    const [toasts, setToasts] = useState<Toast[]>([])

    const showToast = (toast: Omit<Toast, 'id'>) => {
        const id = Math.random().toString(36).substr(2, 9)
        const newToast: Toast = {
            ...toast,
            id,
            duration: toast.duration ?? 5000
        }

        setToasts(prev => [...prev, newToast])

        // Auto remove toast
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id))
        }, newToast.duration)
    }

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id))
    }

    const getIcon = (type: Toast['type']) => {
        switch (type) {
            case 'success':
                return <CheckCircle className="w-5 h-5 text-green-500" />
            case 'error':
                return <XCircle className="w-5 h-5 text-red-500" />
            case 'warning':
                return <AlertCircle className="w-5 h-5 text-yellow-500" />
            case 'info':
                return <Info className="w-5 h-5 text-blue-500" />
        }
    }

    const getBgColor = (type: Toast['type']) => {
        switch (type) {
            case 'success':
                return 'bg-green-50 border-green-200'
            case 'error':
                return 'bg-red-50 border-red-200'
            case 'warning':
                return 'bg-yellow-50 border-yellow-200'
            case 'info':
                return 'bg-blue-50 border-blue-200'
        }
    }

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}

            {/* Toast Container */}
            <div className="fixed top-4 right-4 z-50 space-y-2">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`max-w-sm p-4 rounded-lg border shadow-lg ${getBgColor(toast.type)} animate-in slide-in-from-right-2`}
                    >
                        <div className="flex items-start space-x-3">
                            {getIcon(toast.type)}
                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-medium text-gray-900">
                                    {toast.title}
                                </h4>
                                {toast.message && (
                                    <p className="text-sm text-gray-600 mt-1">
                                        {toast.message}
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={() => removeToast(toast.id)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <XCircle className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    )
}

export function useToast(): ToastContextType {
    const context = React.useContext(ToastContext)
    if (context === undefined) {
        throw new Error('useToast must be used within a ToastProvider')
    }
    return context
}
