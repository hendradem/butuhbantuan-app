import { Toaster } from 'react-hot-toast'
import { ReactQueryClientProvider } from './components/commons/ReactQueryClientProvider'
import './globals.css'
import 'react-spring-bottom-sheet/dist/style.css'
import 'react-loading-skeleton/dist/skeleton.css'
import type { Metadata } from 'next'

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
                <body suppressHydrationWarning={true}>
                    <Toaster />
                    <div className="h-full bg-white grid">
                        <div className="w-[100%] lg:w-[25%] xl:w-[28%] h-full justify-self-center bg-white border-x-[1px] border-gray-100 shadow-sm">
                            {children}
                        </div>
                    </div>
                </body>
            </html>
        </ReactQueryClientProvider>
    )
}
