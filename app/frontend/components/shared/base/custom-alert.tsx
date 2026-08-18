import { Alert, AlertDescription, AlertTitle, Box, Link, ListItem, Stack, Text, UnorderedList } from '@chakra-ui/react';
import { ArrowSquareOutIcon, Info, WarningCircleIcon } from '@phosphor-icons/react';
import React, { FC, ReactElement } from 'react';
import { EDescriptionPartType } from '../../../types/enums';
import { DescriptionPart } from '../../../types/types';

type BaseAlertProps = {
  title?: string;
  icon?: ReactElement;
  borderColor?: string;
  backgroundColor?: string;
  iconColor?: string;
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
      {/* overflow visible: Alert defaults to hidden, which clips the focus ring of
          links sitting flush with its bottom edge. */}
      <Alert status="error" variant="subtle" bg="transparent" alignItems="start" p={0} overflow="visible">
        {/* Render the passed element directly: Chakra's <Icon> has no `icon` prop, so passing one
            silently discarded the caller's icon and fell back to Chakra's default glyph.
            aria-hidden because the alert text already conveys the state. */}
        <Box
          aria-hidden="true"
          zIndex={1}
          color={iconColor}
          fontSize={20}
          flexShrink={0}
          marginTop={'.7rem'}
          marginRight={'.5rem'}
        >
          {icon}
        </Box>
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
  icon = <Info />, // Default icon
  borderColor = 'theme.darkBlue',
  backgroundColor = 'greys.offWhite',
  iconColor = 'theme.darkBlue',
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
      {/* addRole={false}: this panel is static page content, not a response to a user action.
          Chakra's Alert sets role="alert" by default, making it an assertive live region that
          screen readers interrupt to announce on load. */}
      <Alert
        status="info"
        addRole={false}
        variant="subtle"
        bg="transparent"
        alignItems="start"
        p={0}
        overflow="visible"
      >
        {/* Decorative: the alert text already conveys the state, so announcing the icon
            adds nothing for screen readers. */}
        <Box
          aria-hidden="true"
          zIndex={1}
          color={iconColor}
          fontSize={20}
          flexShrink={0}
          marginTop={'.7rem'}
          marginRight={'.5rem'}
        >
          {icon}
        </Box>
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
                  part.type === EDescriptionPartType.Link ? (
                    <Link
                      key={index}
                      href={part.content?.href}
                      isExternal={part.content?.isExternal ?? true}
                      fontSize="md"
                      fontWeight="normal"
                    >
                      {part.content?.text}
                    </Link>
                  ) : (
                    <Text
                      as="span"
                      key={index}
                      {...(part.type === EDescriptionPartType.Bold && { fontWeight: 'bold' })}
                    >
                      {part.content}
                    </Text>
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
