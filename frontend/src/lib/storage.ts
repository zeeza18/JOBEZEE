export const loadFromStorage = <T>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch (error) {
    console.warn('storage read failed', error)
    return fallback
  }
}

export const saveToStorage = <T>(key: string, value: T) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.warn('storage write failed', error)
  }
}

export const resetStorage = (keys: string[] = []) => {
  if (typeof window === 'undefined') return
  if (keys.length === 0) {
    localStorage.clear()
    return
  }
  keys.forEach((key) => localStorage.removeItem(key))
}
