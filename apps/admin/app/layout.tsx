import type { Metadata } from 'next'
import './globals.css'
import Sidebar from './layout/Sidebar'
import Navbar from './layout/Navbar'

export const metadata: Metadata = {
    title: 'Butuhbantuan Admin Page',
    description: 'Butuhbantuan admin page',
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="en">
            <body>
                <div className="flex h-screen">
                    <Sidebar />
                    <Navbar />
                    <main className="bg-white h-screen p-5 pt-[80px] w-full">
                        {children}
                    </main>
                </div>
            </body>
        </html>
    )
}
