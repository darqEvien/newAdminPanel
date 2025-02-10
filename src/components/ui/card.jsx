import * as React from "react"
import PropTypes from 'prop-types'
import { cn } from "@/lib/utils"

const Card = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("rounded-lg border bg-card text-card-foreground shadow-sm", className)} {...props} />
))

const CardHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
))

const CardContent = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))

const CardFooter = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
))

// DisplayName tanımlamaları
Card.displayName = "Card"
CardHeader.displayName = "CardHeader"
CardContent.displayName = "CardContent"
CardFooter.displayName = "CardFooter"

// PropTypes tanımlamaları
const sharedPropTypes = {
  className: PropTypes.string,
  children: PropTypes.node,
}

Card.propTypes = sharedPropTypes
CardHeader.propTypes = sharedPropTypes
CardContent.propTypes = sharedPropTypes
CardFooter.propTypes = sharedPropTypes

// Default props tanımlamaları
const sharedDefaultProps = {
  className: "",
}

Card.defaultProps = sharedDefaultProps
CardHeader.defaultProps = sharedDefaultProps
CardContent.defaultProps = sharedDefaultProps
CardFooter.defaultProps = sharedDefaultProps

export { Card, CardHeader, CardContent, CardFooter }