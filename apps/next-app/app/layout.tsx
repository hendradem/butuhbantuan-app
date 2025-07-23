import { Toaster } from 'react-hot-toast'
import { ReactQueryClientProvider } from '@/components/commons/ReactQueryClientProvider'
import type { Metadata } from 'next'
import './globals.css'
import 'react-spring-bottom-sheet/dist/style.css'
import 'react-loading-skeleton/dist/skeleton.css'
import DetailSheet from '@/components/bottomsheet/detail/DetailSheet'
import ExploreDetailSheet from '@/components/bottomsheet/explore/ExploreDetailSheet'
import SearchSheet from '@/components/bottomsheet/search/SearchSheet'
import ConfirmationSheet from '@/components/bottomsheet/confirmation/ConfirmationSheet'
import ErrorSheet from '@/components/bottomsheet/error/ErrorSheet'

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
                    <div className="main-content default-layout border-x border-neutral-100">
                        {children}
                    </div>
                    <div className="bottom-sheet">
                        <DetailSheet />
                        <ExploreDetailSheet />
                        <SearchSheet />
                        <ConfirmationSheet />
                        <ErrorSheet />
                    </div>
                    <div className="others">
                        <Toaster
                            toastOptions={{
                                style: {
                                    borderRadius: '50px',
                                    background: '#333',
                                    color: '#fff',
                                    fontSize: '0.875rem',
                                },
                                success: {
                                    iconTheme: {
                                        primary: '#10b981', // green-500
                                        secondary: '#ecfdf5',
                                    },
                                },
                                error: {
                                    iconTheme: {
                                        primary: '#ef4444', // red-500
                                        secondary: '#fee2e2',
                                    },
                                },
                            }}
                        />
                    </div>
                </body>
            </html>
        </ReactQueryClientProvider>
    )
}
