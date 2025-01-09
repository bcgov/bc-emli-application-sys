import { Button, ButtonProps } from "@chakra-ui/react"
import React, { ReactElement, forwardRef } from "react"
import { Link as ReactRouterLink } from "react-router-dom"

export interface IRouterLinkButtonProps extends ButtonProps {
  to: string
  icon?: ReactElement
  iconPosition?: string
}

export const RouterLinkButton = forwardRef<HTMLAnchorElement, IRouterLinkButtonProps>(function RouterLinkButton(
  { to, icon, children, iconPosition , ...rest },
  ref
) {
  return (
    <Button 
      as={ReactRouterLink} 
      to={to} 
      variant="primary" 
      ref={ref} 
      {...(iconPosition === "right" ? { rightIcon: icon } : { leftIcon: icon })} 
      {...rest}
    >
      {children}
    </Button>
  )
})
