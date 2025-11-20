import { useEffect } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { LOCAL_STORAGE_KEY } from './constants'
import type { NewProjectFormData } from './types'

export const usePersistentForm = (form: UseFormReturn<NewProjectFormData>) => {
  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY)
      if (!raw) return

      const parsed = JSON.parse(raw) as Partial<NewProjectFormData>
      form.reset({
        ...form.getValues(),
        ...parsed
      })
    } catch (error) {
      console.warn('Failed to restore new project draft', error)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const subscription = form.watch((value) => {
      try {
        window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(value))
      } catch (error) {
        console.warn('Failed to persist new project draft', error)
      }
    })

    return () => subscription.unsubscribe()
  }, [form])
}

export const clearPersistedForm = () => {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(LOCAL_STORAGE_KEY)
}
