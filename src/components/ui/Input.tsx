import type { InputHTMLAttributes, ReactNode } from "react"
import "./Input.css"

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  onClear?: () => void
}

export const Input = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  onClear,
  className = "",
  id,
  ...props
}: InputProps) => {
  const inputId = id || `input-${Math.random().toString(36).slice(2, 9)}`
  const hasError = Boolean(error)
  const showClear = onClear && props.value

  const inputClasses = [
    "input",
    hasError && "input--error",
    leftIcon && "input--with-left-icon",
    (rightIcon || showClear) && "input--with-right-icon",
    className,
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <div className="input-wrapper">
      {label && (
        <label htmlFor={inputId} className="input-label">
          {label}
        </label>
      )}
      <div className="input-container">
        {leftIcon && <span className="input-icon input-icon--left">{leftIcon}</span>}
        <input id={inputId} className={inputClasses} aria-invalid={hasError} {...props} />
        {showClear && (
          <button type="button" className="input-clear" onClick={onClear} aria-label="Rensa fält">
            ✕
          </button>
        )}
        {!showClear && rightIcon && (
          <span className="input-icon input-icon--right">{rightIcon}</span>
        )}
      </div>
      {error && (
        <p className="input-error" role="alert">
          {error}
        </p>
      )}
      {!error && helperText && <p className="input-helper">{helperText}</p>}
    </div>
  )
}
