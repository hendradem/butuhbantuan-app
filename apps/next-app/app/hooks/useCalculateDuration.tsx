const useCalculateDuration = (duration: number) => {
    const calculateDuration = Math.floor(duration / 60)
    return calculateDuration
}

export default useCalculateDuration
