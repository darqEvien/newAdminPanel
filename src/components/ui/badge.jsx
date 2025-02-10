import * as React from "react"
import PropTypes from 'prop-types'
import { cn } from "@/lib/utils"

const Badge = React.forwardRef(({ className, variant = "default", ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
      {
        "bg-primary text-primary-foreground hover:bg-primary/80": variant === "default",
        "bg-destructive text-destructive-foreground hover:bg-destructive/80": variant === "destructive",
        "bg-green-100 text-green-800 hover:bg-green-200": variant === "success",
        "bg-yellow-100 text-yellow-800 hover:bg-yellow-200": variant === "warning",
        "border border-input bg-background hover:bg-accent hover:text-accent-foreground": variant === "outline",
      },
      className
    )}
    {...props}
  />
))

Badge.displayName = "Badge"

Badge.propTypes = {
  className: PropTypes.string,
  variant: PropTypes.oneOf(['default', 'destructive', 'success', 'warning', 'outline']),
  children: PropTypes.node
}

Badge.defaultProps = {
  variant: 'default'
}

export { Badge }