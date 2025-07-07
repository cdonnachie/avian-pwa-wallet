import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    // Clone the request headers
    const requestHeaders = new Headers(request.headers)

    // Add Service-Worker-Allowed header for service worker requests
    if (request.nextUrl.pathname === '/sw.js' || request.nextUrl.pathname.startsWith('/workbox-')) {
        const response = NextResponse.next({
            request: {
                headers: requestHeaders,
            },
        })

        response.headers.set('Service-Worker-Allowed', '/')

        if (request.nextUrl.pathname === '/sw.js') {
            response.headers.set('Cache-Control', 'public, max-age=0, must-revalidate')
            response.headers.set('Content-Type', 'application/javascript; charset=utf-8')
        }

        if (request.nextUrl.pathname.startsWith('/workbox-')) {
            response.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
            response.headers.set('Content-Type', 'application/javascript; charset=utf-8')
        }

        return response
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/sw.js', '/workbox-:path*'],
}
