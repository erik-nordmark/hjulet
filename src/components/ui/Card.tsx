import type { HTMLAttributes, ReactNode } from "react"
import "./Card.css"

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  variant?: "default" | "outlined" | "elevated"
  padding?: "none" | "small" | "medium" | "large"
}

export const Card = ({
  children,
  variant = "default",
  padding = "medium",
  className = "",
  ...props
}: CardProps) => {
  const classes = ["card", `card--${variant}`, `card--padding-${padding}`, className]
    .filter(Boolean)
    .join(" ")

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  )
}

export interface CardHeaderProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode
  actions?: ReactNode
}

export const CardHeader = ({ children, actions, className = "", ...props }: CardHeaderProps) => {
  return (
    <header className={`card__header ${className}`} {...props}>
      <div className="card__title">{children}</div>
      {actions && <div className="card__actions">{actions}</div>}
    </header>
  )
}

export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export const CardContent = ({ children, className = "", ...props }: CardContentProps) => {
  return (
    <div className={`card__content ${className}`} {...props}>
      {children}
    </div>
  )
}

export interface CardFooterProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode
}

export const CardFooter = ({ children, className = "", ...props }: CardFooterProps) => {
  return (
    <footer className={`card__footer ${className}`} {...props}>
      {children}
    </footer>
  )
}
