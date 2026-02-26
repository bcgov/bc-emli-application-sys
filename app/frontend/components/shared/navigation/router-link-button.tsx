import { Button, ButtonProps } from '@chakra-ui/react';
import React, { ReactElement, forwardRef } from 'react';
import { Link as ReactRouterLink } from 'react-router-dom';
import { colors } from '../../../styles/theme/foundations/colors';

export interface IRouterLinkButtonProps extends ButtonProps {
  to?: string;
  icon?: ReactElement;
  iconPosition?: string;
  variant?: string;
}

export const RouterLinkButton = forwardRef<HTMLAnchorElement, IRouterLinkButtonProps>(function RouterLinkButton(
  { to, icon, children, iconPosition, bg, variant = 'primary', onClick, isDisabled, ...rest }, // Default values
  ref,
) {
  return (
    <Button
      as={ReactRouterLink}
      to={to}
      ref={ref}
      bg={bg}
      variant={variant}
      isDisabled={isDisabled}
      aria-disabled={isDisabled}
      tabIndex={isDisabled ? -1 : rest.tabIndex}
      pointerEvents={isDisabled ? 'none' : rest.pointerEvents}
      onClick={(event) => {
        if (isDisabled) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }

        onClick?.(event);
      }}
      {...(iconPosition === 'right' ? { rightIcon: icon } : { leftIcon: icon })}
      {...rest}
    >
      {children}
    </Button>
  );
});
