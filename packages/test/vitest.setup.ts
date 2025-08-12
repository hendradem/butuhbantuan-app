import '@testing-library/jest-dom'

import { vi } from 'vitest'

vi.mock('@iconify/react', () => {
    const DummyIcon = () => null
    return {
        Icon: DummyIcon,
        default: DummyIcon,
    }
})
