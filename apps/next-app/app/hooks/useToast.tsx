import { toast } from 'react-hot-toast'

export const useToast = () => {
    return (message = 'Mencarikan data untukmu', autoClose = false) => {
        const id = toast.loading(message, {
            style: {
                borderRadius: '20px',
                background: '#333',
                color: '#fff',
            },
        })

        if (autoClose) {
            setTimeout(() => toast.dismiss(id), 2000) // auto dismiss after 2s
        }

        return id
    }
}
