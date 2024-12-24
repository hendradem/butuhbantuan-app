const useUserLocation = () => {
    const latitude = window.localStorage.getItem('lat')
    const longitude = window.localStorage.getItem('long')
    const address = window.localStorage.getItem('address')
    const urbanVillage = window.localStorage.getItem('urban_village')
    const currentUserLocation = { latitude, longitude, address, urbanVillage }

    const setUserLocation = (
        latState: number,
        longState: number,
        address?: string | undefined,
        urbanVillage?: string | undefined
    ): void => {
        window.localStorage.setItem('lat', latState.toString())
        window.localStorage.setItem('long', longState.toString())
        window.localStorage.setItem('address', address?.toString() || '')
        window.localStorage.setItem(
            'urban_village',
            urbanVillage?.toString() || ''
        )
    }

    return { setUserLocation, currentUserLocation }
}

export default useUserLocation
