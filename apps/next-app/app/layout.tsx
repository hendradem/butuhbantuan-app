import Script from 'next/script'
import ChangeLocationModal from './components/modals/ChangeLocationModal'
import './globals.css'
import 'react-spring-bottom-sheet/dist/style.css'
import 'react-loading-skeleton/dist/skeleton.css'

export const metadata = {
    title: 'Butuh Bantuan App',
    description: 'An emergency help for you',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <body suppressHydrationWarning={true}>
                <ChangeLocationModal />
                <div className="h-full bg-white grid">
                    <div className="w-[100%] lg:w-[25%] xl:w-[28%] h-full justify-self-center bg-white border-x-[1px] border-gray-100 shadow-sm">
                        {children}
                    </div>
                </div>
            </body>
        </html>
    )
}
