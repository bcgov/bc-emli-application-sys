import {
  Box,
  Button,
  ButtonProps,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  Link,
  Text,
  useDisclosure,
} from '@chakra-ui/react';
import { Envelope, Phone } from '@phosphor-icons/react';
import React, { Ref, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

interface IProps {
  defaultButtonProps?: Partial<ButtonProps>;
  renderTriggerButton?: (props: ButtonProps & { ref: Ref<HTMLElement> }) => JSX.Element;
}

// Shared styles for better performance
const iconBoxStyles = {
  bg: 'theme.darkBlue',
  w: 8,
  h: 8,
  borderRadius: 'full',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
} as const;

const textStyles = {
  fontSize: '16px',
  lineHeight: '27px',
  color: 'greys.homeScreenGrey',
} as const;

const linkStyles = {
  ...textStyles,
  textDecoration: 'underline',
  mb: 2,
  display: 'block',
} as const;

const listStyles = {
  as: 'ul' as const,
  listStyleType: 'disc',
  pl: 4,
  color: 'greys.homeScreenGrey',
};

export function HelpDrawer({ defaultButtonProps, renderTriggerButton }: IProps) {
  const { t } = useTranslation();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const btnRef = useRef<HTMLButtonElement>(null);

  // Memoize email hrefs to avoid recreating on each render
  const emailHrefs = useMemo(
    () => ({
      groundOriented: `mailto:${t('site.helpDrawer.groundOrientedEmail')}`,
      multiUnit: `mailto:${t('site.helpDrawer.multiUnitEmail')}`,
    }),
    [t],
  );

  return (
    <>
      {renderTriggerButton?.({ onClick: onOpen, ref: btnRef }) ?? (
        <Button
          variant="solid"
          bg="theme.darkBlue"
          color="white"
          px={4}
          py={2}
          onClick={onOpen}
          aria-label={t('ui.openHelpDrawer')}
          _hover={{ bg: 'theme.blueButtonHover' }}
          fontSize="16px"
          fontWeight={400}
          lineHeight="27px"
          {...defaultButtonProps}
        >
          {t('ui.contact')}
        </Button>
      )}

      <Drawer isOpen={isOpen} onClose={onClose} finalFocusRef={btnRef} placement="right">
        <DrawerOverlay />
        <DrawerContent
          display="flex"
          flexDir="column"
          h="full"
          maxW="430px"
          boxShadow="0px 0px 2px rgba(0, 0, 0, 0.05), 0px 8px 15px rgba(0, 0, 0, 0.08)"
        >
          <DrawerCloseButton fontSize="xs" />
          <DrawerHeader p={6} fontSize="28px" lineHeight="42px">
            {t('ui.contact')}
          </DrawerHeader>

          <DrawerBody p={6}>
            <Flex direction="column" gap={6}>
              {/* Telephone Section */}
              <Flex direction="row" alignItems="flex-start" gap={2}>
                <Box as="span" {...iconBoxStyles}>
                  <Phone size={16} color="white" />
                </Box>
                <Box flex={1}>
                  <Text fontWeight="bold" {...textStyles} mb={0}>
                    {t('site.helpDrawer.phoneTitle')}
                  </Text>
                  <Text {...textStyles} color="greys.anotherGrey" mb={0}>
                    {t('auth.bcServiceCardInfo.energyCoach.phoneNumber')}
                  </Text>
                  <Text {...textStyles} color="greys.anotherGrey" mb={0}>
                    {t('site.helpDrawer.phoneHours')}
                  </Text>
                  <Text {...textStyles} color="greys.anotherGrey">
                    {t('site.helpDrawer.phoneHoursNote')}
                  </Text>
                </Box>
              </Flex>

              {/* Email Section - Ground-oriented home types */}
              <Flex direction="row" alignItems="flex-start" gap={2}>
                <Box as="span" {...iconBoxStyles}>
                  <Envelope size={16} color="white" />
                </Box>
                <Box flex={1}>
                  <Text fontWeight="bold" {...textStyles} mb={0}>
                    {t('site.helpDrawer.emailTitle')}
                  </Text>
                  <Text {...textStyles} mb={0}>
                    {t('site.helpDrawer.groundOrientedTitle')}
                  </Text>
                  <Link
                    href={emailHrefs.groundOriented}
                    {...linkStyles}
                    aria-label={t('site.helpDrawer.groundOrientedEmailAriaLabel')}
                  >
                    {t('site.helpDrawer.groundOrientedEmail')}
                  </Link>
                  <Box {...listStyles} mb={6}>
                    <Text as="li" {...textStyles}>
                      {t('site.helpDrawer.singleFamilyHome')}
                    </Text>
                    <Text as="li" {...textStyles}>
                      {t('site.helpDrawer.secondarySuite')}
                    </Text>
                    <Text as="li" {...textStyles}>
                      {t('site.helpDrawer.duplexTriplex')}
                    </Text>
                    <Text as="li" {...textStyles}>
                      {t('site.helpDrawer.rowTownhome')}
                    </Text>
                    <Text as="li" {...textStyles}>
                      {t('site.helpDrawer.manufacturedHome')}
                    </Text>
                  </Box>

                  <Text {...textStyles} mt={4} mb={0}>
                    {t('site.helpDrawer.multiUnitTitle')}
                  </Text>
                  <Link
                    href={emailHrefs.multiUnit}
                    {...linkStyles}
                    aria-label={t('site.helpDrawer.multiUnitEmailAriaLabel')}
                  >
                    {t('site.helpDrawer.multiUnitEmail')}
                  </Link>
                  <Box {...listStyles}>
                    <Text as="li" {...textStyles}>
                      {t('site.helpDrawer.apartmentCondo')}
                    </Text>
                    <Text as="li" {...textStyles}>
                      {t('site.helpDrawer.stackedTownhouse')}
                    </Text>
                    <Text as="li" {...textStyles}>
                      {t('site.helpDrawer.multiplexes')}
                    </Text>
                  </Box>
                </Box>
              </Flex>
            </Flex>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
}
