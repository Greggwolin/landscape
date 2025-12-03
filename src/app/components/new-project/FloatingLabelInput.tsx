'use client'

import { forwardRef, useState, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface FloatingLabelInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

const FloatingLabelInput = forwardRef<HTMLInputElement, FloatingLabelInputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false)
    const hasValue = props.value !== undefined && props.value !== ''

    const inputId = id || `floating-${label.toLowerCase().replace(/\s+/g, '-')}`

    return (
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          {...props}
          onFocus={(e) => {
            setIsFocused(true)
            props.onFocus?.(e)
          }}
          onBlur={(e) => {
            setIsFocused(false)
            props.onBlur?.(e)
          }}
          placeholder=" "
          className={cn(
            'peer w-full rounded-md border bg-slate-800/50 px-3 pb-2 pt-5 text-sm text-slate-100 placeholder-transparent transition',
            'focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
            error ? 'border-rose-500' : 'border-slate-700',
            className
          )}
        />
        <label
          htmlFor={inputId}
          className={cn(
            'absolute left-3 transition-all duration-200 pointer-events-none',
            'peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-placeholder-shown:text-slate-500',
            'peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-blue-400',
            (isFocused || hasValue) ? 'top-1.5 text-xs text-blue-400' : 'top-3.5 text-sm text-slate-500'
          )}
        >
          {label}
        </label>
        {error && (
          <p className="mt-1 text-xs text-rose-400">{error}</p>
        )}
      </div>
    )
  }
)

FloatingLabelInput.displayName = 'FloatingLabelInput'

export default FloatingLabelInput
