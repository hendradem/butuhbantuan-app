'use client'
export function setRealViewportHeight() {
    if (window) {
        const vh = window.innerHeight * 0.01
        document.documentElement.style.setProperty('--vh', `${vh}px`)
    }
}
