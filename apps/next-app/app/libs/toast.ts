import { toast } from 'react-hot-toast'

const defaultStyle = {
    borderRadius: '20px',
    background: '#333',
    color: '#fff',
}

export const toastService = {
    showLoading: (message: string) =>
        toast.loading(message, { style: defaultStyle }),
    success: (message: string) =>
        toast.success(message, { style: defaultStyle }),
    error: (message: string) => toast.error(message, { style: defaultStyle }),
    dismiss: (id?: string) => toast.dismiss(id),
}
