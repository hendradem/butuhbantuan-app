import { ReactQueryClientProvider } from '@/components/commons/ReactQueryClientProvider'
import AppShell from '@/components/layout/AppShell'
import type { Metadata } from 'next'
import './globals.css'
import 'react-spring-bottom-sheet/dist/style.css'
import 'react-loading-skeleton/dist/skeleton.css'

export const metadata: Metadata = {
    metadataBase: new URL('https://butuhbantuan.com'),
    title: 'Butuhbantuan',
    description: 'an emergency assistant for you',
    category: 'website',
    generator: 'Next.js',
    manifest: '/manifest.json',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <ReactQueryClientProvider>
            <html lang="en">
                <head>
                    <link rel="manifest" href="/manifest.json" />
                    <link rel="apple-touch-icon" href="/ambulance-logo.jpg" />
                    <meta name="theme-color" content="#0f172a" />
                </head>
                <body
                    suppressHydrationWarning={true}
                    className="h-screen-dynamic"
                >
                    <AppShell>{children}</AppShell>
                </body>
            </html>
        </ReactQueryClientProvider>
    )
}
