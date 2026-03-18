import {
  Alert,
  AlertDescription,
  AlertTitle,
  Box,
  Icon,
  Link,
  ListItem,
  Stack,
  Text,
  UnorderedList,
} from '@chakra-ui/react';
import { ArrowSquareOutIcon, WarningCircleIcon, InfoIcon } from '@phosphor-icons/react';
import React, { FC, ReactElement } from 'react';

type BaseAlertProps = {
  title?: string;
  icon?: ReactElement;
  borderColor?: string;
  backgroundColor?: string;
  iconColor?: string;
  ariaLabel?: string;
};

// Extend by adding more properties
type CustomAlertProps = BaseAlertProps & {
  description?: string;
  descLinkText?: string; // Optional description link text
  descLinkHref?: string; // Optional description link URL
  items?: string[]; // Optional list of error details
  linkText?: string; // Optional link text
  linkHref?: string; // Optional link URL
};

export type DescriptionPart =
  | { type: 'text'; content: string; renderHTMLTag?: boolean }
  | { type: 'link'; text: string; href: string; isExternal?: boolean };

// Extend by adding more properties
type CustomInformationAlertProps = BaseAlertProps & {
  descriptionParts?: DescriptionPart[];
};

const CustomAlert: FC<CustomAlertProps> = ({
  title,
  description,
  descLinkText,
  descLinkHref,
  items = [],
  linkText,
  linkHref,
  icon = <WarningCircleIcon size={27} />, // Default icon
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
        <InfoIcon
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
              {linkText} <ArrowSquareOutIcon />
            </Link>
          )}
        </Stack>
      </Alert>
    </Stack>
  );
};

export const InformationAlert: FC<CustomInformationAlertProps> = ({
  title,
  descriptionParts,
  icon = <InfoIcon />, // Default icon
  borderColor = 'theme.darkBlue',
  backgroundColor = 'greys.offWhite',
  iconColor = 'theme.darkBlue',
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
          {descriptionParts && (
            <AlertDescription fontSize="md" fontWeight="normal" lineHeight="normal">
              <Text mb={2}>
                {descriptionParts.map((part, index) =>
                  part.type === 'link' ? (
                    <Link
                      key={index}
                      href={part.href}
                      isExternal={part.isExternal ?? true}
                      fontSize="md"
                      fontWeight="normal"
                    >
                      {part.text}
                    </Link>
                  ) : part.renderHTMLTag ? (
                    <Text as="span" dangerouslySetInnerHTML={{ __html: part.content }} />
                  ) : (
                    <React.Fragment key={index}>{part.content}</React.Fragment>
                  ),
                )}
              </Text>
            </AlertDescription>
          )}
        </Stack>
      </Alert>
    </Stack>
  );
};

export default CustomAlert;
