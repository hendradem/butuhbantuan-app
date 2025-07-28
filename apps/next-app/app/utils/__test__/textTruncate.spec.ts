import { truncateText } from '../textTruncate'

describe('truncateText', () => {
    it('returns original text if length <= maxLength', () => {
        expect(truncateText('Hello', 10)).toBe('Hello')
        expect(truncateText('', 5)).toBe('')
        expect(truncateText('12345', 5)).toBe('12345')
    })

    it('truncates and adds ".." if text is longer than maxLength', () => {
        expect(truncateText('Hello world', 5)).toBe('Hello..')
        expect(truncateText('This is a long sentence', 10)).toBe('This is a..')
    })

    it('trims the end before adding ".."', () => {
        expect(truncateText('Hello world ', 11)).toBe('Hello world..') // space trimmed
    })

    it('handles edge cases gracefully', () => {
        expect(truncateText('', 0)).toBe('')
        expect(truncateText('a', 0)).toBe('..')
    })
})
