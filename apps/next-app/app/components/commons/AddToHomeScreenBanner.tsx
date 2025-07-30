'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Icon from '@/components/ui/Icon'

const STORAGE_KEY = 'pwa-install-dismissed'

const AddToHomeScreenBanner = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
    const [showBanner, setShowBanner] = useState(true) // show by default

    useEffect(() => {
        const dismissed = localStorage.getItem(STORAGE_KEY)
        if (dismissed === 'true') {
            setShowBanner(false)
            return
        }

        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault()
            setDeferredPrompt(e)
        }

        const handleAppInstalled = () => {
            hideBannerPermanently()
        }

        window.addEventListener(
            'beforeinstallprompt',
            handleBeforeInstallPrompt
        )
        window.addEventListener('appinstalled', handleAppInstalled)

        return () => {
            window.removeEventListener(
                'beforeinstallprompt',
                handleBeforeInstallPrompt
            )
            window.removeEventListener('appinstalled', handleAppInstalled)
        }
    }, [])

    const hideBannerPermanently = () => {
        localStorage.setItem(STORAGE_KEY, 'true')
        setDeferredPrompt(null)
        setShowBanner(false)
    }

    const handleInstallClick = async () => {
        if (!deferredPrompt) {
            console.log('Install prompt not ready yet')
            hideBannerPermanently()
            return
        }

        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice

        if (outcome === 'accepted') {
            console.log('User accepted install')
        } else {
            console.log('User cancelled install')
        }

        hideBannerPermanently()
    }

    const handleDismissClick = () => {
        hideBannerPermanently()
    }

    if (!showBanner) return null

    return (
        <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="fixed top-0 left-0 right-0 max-w-md shadow mx-auto z-50 w-full bg-emerald-500 h-[60px] flex items-center justify-center px-3 text-white"
        >
            <div className="w-full flex justify-between">
                <div className="flex gap-3 items-center">
                    <div className="w-9 h-9 bg-white rounded-full items-center justify-center hidden xl:flex lg:flex md:flex">
                        <Icon
                            name="fluent:phone-chat-16-regular"
                            className="w-5 h-5 text-emerald-800"
                        />
                    </div>
                    <div>
                        <p className="m-0 leading-none text-[15px]">
                            Install Butuhbantuan
                        </p>
                        <p className="text-xs m-0 leading-tight text-neutral-100 font-normal">
                            Sekali klik, penggunaan lebih mudah.
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        className="bg-white flex items-center justify-center rounded-lg text-emerald-700 px-4 py-1 shadow-none gap-2 text-sm"
                        onClick={handleInstallClick}
                    >
                        <Icon
                            name="solar:download-square-outline"
                            className="w-4 h-4"
                        />
                        Install
                    </button>
                    <div
                        onClick={handleDismissClick}
                        className="w-9 h-9 hover:bg-white cursor-pointer rounded-full flex items-center justify-center transition-all duration-200"
                    >
                        <Icon
                            name="ph:x"
                            className="w-5 h-5 text-white hover:text-emerald-500"
                        />
                    </div>
                </div>
            </div>
        </motion.div>
    )
}

export default AddToHomeScreenBanner
