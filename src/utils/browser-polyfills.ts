// Global polyfills for browser compatibility
if (typeof window !== 'undefined' && typeof window.require === 'undefined') {
    // Define a minimal require function for browser compatibility
    (window as any).require = function (id: string) {
        throw new Error(`Module '${id}' not available in browser environment`)
    }
}

// Also add to globalThis for broader compatibility  
if (typeof globalThis !== 'undefined' && typeof (globalThis as any).require === 'undefined') {
    (globalThis as any).require = function (id: string) {
        throw new Error(`Module '${id}' not available in browser environment`)
    }
}

export { }
