import { convertPhoneNumber } from '../covertPhoneNumber'

describe('convertPhoneNumber', () => {
    it('should replace starting 0 with 62', () => {
        expect(convertPhoneNumber('08123456789')).toBe('628123456789')
    })

    it('should return unchanged if it does not start with 0', () => {
        expect(convertPhoneNumber('628123456789')).toBe('628123456789')
    })

    it('should only replace the first 0', () => {
        expect(convertPhoneNumber('081002345006')).toBe('6281002345006')
    })

    it('should return the same string if empty', () => {
        expect(convertPhoneNumber('')).toBe('')
    })
})
