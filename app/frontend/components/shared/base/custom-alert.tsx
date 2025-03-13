import {
  Alert,
  AlertDescription,
  AlertTitle,
  Box,
  IconButton,
  Icon,
  Link,
  ListItem,
  Stack,
  Text,
  UnorderedList,
  Flex,
} from '@chakra-ui/react';
import { ArrowSquareOut, WarningCircle, Info } from '@phosphor-icons/react';
import React, { FC, ReactElement } from 'react';

type CustomAlertProps = {
  title?: string;
  description?: string;
  descLinkText?: string; // Optional description link text
  descLinkHref?: string; // Optional description link URL
  items?: string[]; // Optional list of error details
  linkText?: string; // Optional link text
  linkHref?: string; // Optional link URL
  icon?: ReactElement; // Optional icon
  borderColor?: string; // Optional border color
  backgroundColor?: string; // Optional background color
  iconColor?: string; // Optional icon color
  ariaLabel?: string;
};

const CustomAlert: FC<CustomAlertProps> = ({
  title,
  description,
  descLinkText,
  descLinkHref,
  items = [],
  linkText,
  linkHref,
  icon = <WarningCircle size={27} />, // Default icon
  borderColor = 'semantic.error', // Default border color
  backgroundColor = 'semantic.errorLight', // Default background color
  iconColor = 'semantic.error', // Default icon color
  ariaLabel = 'Error Icon',
}) => {
  return (
    <Stack
      p={4}
      mt={4}
      bg={backgroundColor}
      border="1px"
      borderColor={borderColor}
      borderRadius="lg"
      width="100%"
      align="stretch"
    >
      <Alert status="error" variant="subtle" bg="transparent" alignItems="start" p={0}>
        <Icon
          variant="ghost"
          icon={icon}
          zIndex={1}
          color={iconColor}
          aria-label={ariaLabel}
          fontSize={20}
          marginTop={'.7rem'}
          marginRight={'.5rem'}
        />
        <Stack mt={2}>
          {title && (
            <AlertTitle fontSize="md" fontWeight="bold">
              {title}
            </AlertTitle>
          )}
          <AlertDescription fontSize="md" fontWeight="normal" lineHeight="normal">
            <Box>
              <Text mb={2}>{description}</Text>
              {items.length > 0 && (
                <UnorderedList spacing={1}>
                  {items.map((item, index) => (
                    <ListItem key={index}>{item}</ListItem>
                  ))}
                </UnorderedList>
              )}
              {descLinkText && (
                <Link href={descLinkHref} isExternal fontSize="md" fontWeight="normal">
                  {descLinkText}
                </Link>
              )}
            </Box>
          </AlertDescription>
          {linkText && (
            <Link href={linkHref} isExternal fontSize="md" fontWeight="normal">
              {linkText} <ArrowSquareOut />
            </Link>
          )}
        </Stack>
      </Alert>
    </Stack>
  );
};

export const InformationAlert: FC<CustomAlertProps> = ({
  title,
  description,
  descLinkText,
  descLinkHref,
  icon = <Info />, // Default icon
  borderColor = 'theme.darkBlue', // Default border color
  backgroundColor = 'greys.offWhite', // Default background color
  iconColor = 'theme.darkBlue', // Default icon color
  ariaLabel = 'Information Icon',
}) => {
  return (
    <Stack
      p={4}
      mt={4}
      bg={backgroundColor}
      border="1px"
      borderColor={borderColor}
      borderRadius="lg"
      width="100%"
      align="stretch"
    >
      <Alert status="error" variant="subtle" bg="transparent" alignItems="start" p={0}>
        <Icon
          variant="ghost"
          icon={icon}
          zIndex={1}
          color={iconColor}
          aria-label={ariaLabel}
          fontSize={20}
          marginTop={'.7rem'}
          marginRight={'.5rem'}
        />
        <Stack mt={2}>
          {title && (
            <AlertTitle fontSize="md" fontWeight="bold">
              {title}
            </AlertTitle>
          )}
          <AlertDescription fontSize="md" fontWeight="normal" lineHeight="normal">
            <Text mb={2}>
              {description}
              {descLinkText && (
                <Link href={descLinkHref} isExternal fontSize="md" fontWeight="normal">
                  {descLinkText}
                </Link>
              )}
            </Text>
          </AlertDescription>
        </Stack>
      </Alert>
    </Stack>
  );
};

export default CustomAlert;
