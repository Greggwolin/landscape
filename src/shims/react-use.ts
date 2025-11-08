// Minimal fallback shims for react-use hooks accessed by the Materio starter.

export function useCookie<T = string>(key: string, initial?: T) {
  if (typeof window === 'undefined') return [initial as T | undefined, () => {}, () => {}] as const

  const get = () => {
    const m = document.cookie.match(new RegExp('(^| )' + key + '=([^;]+)'))
    try { return m ? (JSON.parse(decodeURIComponent(m[2])) as T) : initial } catch { return initial }
  }

  const set = (val: T) => document.cookie = `${key}=${encodeURIComponent(JSON.stringify(val))}; path=/; SameSite=Lax`

  const remove = () => document.cookie = `${key}=; Max-Age=0; path=/; SameSite=Lax`

  return [get(), set, remove] as const
}

export const useLocalStorage = <T = unknown>(k: string, i?: T) => [i, () => {}, () => {}] as const

export const useSessionStorage = <T = unknown>(k: string, i?: T) => [i, () => {}, () => {}] as const
