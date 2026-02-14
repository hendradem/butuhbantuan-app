import { cityNameFormat } from '../cityNameFormat'

describe('cityNameFormat', () => {
    it('should remove "kota" and capitalize properly', () => {
        expect(cityNameFormat('Kota Bandung')).toBe('Bandung')
    })

    it('should remove "kabupaten" and capitalize properly', () => {
        expect(cityNameFormat('Kabupaten Sleman')).toBe('Sleman')
    })

    it('should handle mixed casing and extra spaces', () => {
        expect(cityNameFormat('   KaBuPaTeN   JEMBER  ')).toBe('Jember')
    })

    it('should handle names without kota/kabupaten', () => {
        expect(cityNameFormat('Semarang')).toBe('Semarang')
    })

    it('should handle multi-word names', () => {
        expect(cityNameFormat('Kota Jakarta Selatan')).toBe('Jakarta Selatan')
    })

    it('should return empty string when input is empty', () => {
        expect(cityNameFormat('')).toBe('')
    })
})
