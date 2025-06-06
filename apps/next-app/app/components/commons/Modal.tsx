import React from 'react'
import type { JSX } from 'react'

type ModalProps = {
    children: JSX.Element
}

const Modal: React.FC<ModalProps> = ({ children }) => {
    return (
        <div className="fixed z-20 bg-opacity-60 w-full h-screen bg-black flex items-center justify-center">
            {children}
        </div>
    )
}

export default Modal
