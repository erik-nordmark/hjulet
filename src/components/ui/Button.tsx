import type { ButtonHTMLAttributes, ReactNode } from "react"
import "./Button.css"

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost"
export type ButtonSize = "small" | "medium" | "large"

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  children: ReactNode
}

export const Button = ({
  variant = "primary",
  size = "medium",
  isLoading = false,
  leftIcon,
  rightIcon,
  className = "",
  disabled,
  children,
  ...props
}: ButtonProps) => {
  const classes = ["btn", `btn--${variant}`, `btn--${size}`, isLoading && "btn--loading", className]
    .filter(Boolean)
    .join(" ")

  return (
    <button className={classes} disabled={disabled || isLoading} {...props}>
      {isLoading && (
        <span className="btn__spinner" role="status" aria-label="Laddar">
          <span className="spinner" />
        </span>
      )}
      {!isLoading && leftIcon && <span className="btn__icon btn__icon--left">{leftIcon}</span>}
      <span className="btn__text">{children}</span>
      {!isLoading && rightIcon && <span className="btn__icon btn__icon--right">{rightIcon}</span>}
    </button>
  )
}
