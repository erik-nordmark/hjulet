import type { HTMLAttributes, ReactNode } from "react"
import "./Alert.css"

export type AlertVariant = "info" | "success" | "warning" | "error"

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant: AlertVariant
  children: ReactNode
  onClose?: () => void
  icon?: ReactNode
}

const defaultIcons: Record<AlertVariant, string> = {
  info: "ℹ️",
  success: "✓",
  warning: "⚠️",
  error: "✕",
}

export const Alert = ({
  variant,
  children,
  onClose,
  icon,
  className = "",
  ...props
}: AlertProps) => {
  const classes = ["alert", `alert--${variant}`, className].filter(Boolean).join(" ")

  return (
    <div className={classes} role="alert" {...props}>
      <div className="alert__icon" aria-hidden="true">
        {icon || defaultIcons[variant]}
      </div>
      <div className="alert__content">{children}</div>
      {onClose && (
        <button
          type="button"
          className="alert__close"
          onClick={onClose}
          aria-label="Stäng meddelande"
        >
          ✕
        </button>
      )}
    </div>
  )
}
