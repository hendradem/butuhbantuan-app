// app/components/layout/AppShell.tsx
'use client'

import { Toaster } from 'react-hot-toast'
import DetailSheet from '@/components/bottomsheet/detail/DetailSheet'
import ExploreDetailSheet from '@/components/bottomsheet/explore/ExploreDetailSheet'
import SearchSheet from '@/components/bottomsheet/search/SearchSheet'
import ConfirmationSheet from '@/components/bottomsheet/confirmation/ConfirmationSheet'
import ErrorSheet from '@/components/bottomsheet/error/ErrorSheet'

const AppShell = ({ children }: { children: React.ReactNode }) => {
    return (
        <div>
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
            <div className="toaster">
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
                                primary: '#10b981',
                                secondary: '#ecfdf5',
                            },
                        },
                        error: {
                            iconTheme: {
                                primary: '#ef4444',
                                secondary: '#fee2e2',
                            },
                        },
                    }}
                />
            </div>
        </div>
    )
}

export default AppShell
