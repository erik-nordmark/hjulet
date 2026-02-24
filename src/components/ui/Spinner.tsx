import type { HTMLAttributes } from "react"
import "./Spinner.css"

export interface SpinnerProps extends HTMLAttributes<HTMLDivElement> {
  size?: "small" | "medium" | "large"
  color?: "primary" | "secondary" | "white"
  label?: string
}

export const Spinner = ({
  size = "medium",
  color = "primary",
  label = "Laddar...",
  className = "",
  ...props
}: SpinnerProps) => {
  const classes = ["spinner-container", `spinner-container--${size}`, className]
    .filter(Boolean)
    .join(" ")

  const spinnerClasses = ["spinner", `spinner--${color}`].filter(Boolean).join(" ")

  return (
    <div className={classes} role="status" aria-label={label} {...props}>
      <div className={spinnerClasses} />
      <span className="sr-only">{label}</span>
    </div>
  )
}
