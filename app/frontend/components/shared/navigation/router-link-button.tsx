import { Button, ButtonProps } from "@chakra-ui/react"
import React, { ReactElement, forwardRef } from "react"
import { Link as ReactRouterLink } from "react-router-dom"

export interface IRouterLinkButtonProps extends ButtonProps {
  to?: string
  icon?: ReactElement
  iconPosition?: string
  colorScheme?: string
  variant?: string
}

export const RouterLinkButton = forwardRef<HTMLAnchorElement, IRouterLinkButtonProps>(function RouterLinkButton(
  { to, icon, children, iconPosition, colorScheme = "blue", variant = "solid", ...rest }, // Default values
  ref
) {
  return (
    <Button
      as={ReactRouterLink}
      to={to}
      ref={ref}
      colorScheme={colorScheme}
      variant={variant}
      {...(iconPosition === "right" ? { rightIcon: icon } : { leftIcon: icon })}
      {...rest}
    >
      {children}
    </Button>
  )
})
