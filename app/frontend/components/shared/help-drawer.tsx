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
  Hide,
  Link,
  Show,
  Text,
  useDisclosure,
} from '@chakra-ui/react';
import { Envelope, Phone } from '@phosphor-icons/react';
import React, { Ref, useRef } from 'react';
import { useTranslation } from 'react-i18next';

interface IProps {
  defaultButtonProps?: Partial<ButtonProps>;
  renderTriggerButton?: (props: ButtonProps & { ref: Ref<HTMLElement> }) => JSX.Element;
}

export function HelpDrawer({ defaultButtonProps, renderTriggerButton }: IProps) {
  const { t } = useTranslation();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const btnRef = useRef<HTMLButtonElement>(null);

  const groundOrientedEmailHref = `mailto:${t('site.helpDrawer.groundOrientedEmail')}`;
  const multiUnitEmailHref = `mailto:${t('site.helpDrawer.multiUnitEmail')}`;

  const baseTextSx = { fontSize: '16px', lineHeight: '27px', color: 'greys.homeScreenGrey' };
  const iconBoxSx = {
    bg: 'theme.darkBlue',
    w: 8,
    h: 8,
    borderRadius: 'full',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  };
  const linkSx = { ...baseTextSx, textDecoration: 'underline', mb: 2, display: 'block' };
  const listBoxSx = { as: 'ul', listStyleType: 'disc', pl: 4, color: 'greys.homeScreenGrey' };

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
                <Box as="span" sx={iconBoxSx}>
                  <Phone size={16} color="white" />
                </Box>
                <Box flex={1}>
                  <Text fontWeight="bold" sx={baseTextSx} mb={0}>
                    {t('site.helpDrawer.phoneTitle')}
                  </Text>
                  <Show below="md">
                    <Link
                      href={`tel:${t('auth.bcServiceCardInfo.energyCoach.phoneNumber')}`}
                      sx={{ ...baseTextSx, color: 'greys.anotherGrey' }}
                    >
                      {t('auth.bcServiceCardInfo.energyCoach.phoneNumber')}
                    </Link>
                  </Show>
                  <Hide below="md">
                    <Text sx={{ ...baseTextSx, color: 'greys.anotherGrey' }}>
                      {t('auth.bcServiceCardInfo.energyCoach.phoneNumber')}
                    </Text>
                  </Hide>
                  <Text sx={{ ...baseTextSx, color: 'greys.anotherGrey' }} mb={0}>
                    {t('site.helpDrawer.phoneHours')}
                  </Text>
                  <Text sx={{ ...baseTextSx, color: 'greys.anotherGrey' }}>{t('site.helpDrawer.phoneHoursNote')}</Text>
                </Box>
              </Flex>

              {/* Email Section - Ground-oriented home types */}
              <Flex direction="row" alignItems="flex-start" gap={2}>
                <Box as="span" sx={iconBoxSx}>
                  <Envelope size={16} color="white" />
                </Box>
                <Box flex={1}>
                  <Text fontWeight="bold" sx={baseTextSx} mb={0}>
                    {t('site.helpDrawer.emailTitle')}
                  </Text>
                  <Link
                    href={groundOrientedEmailHref}
                    sx={linkSx}
                    aria-label={t('site.helpDrawer.groundOrientedEmailAriaLabel')}
                  >
                    {t('site.helpDrawer.groundOrientedEmail')}
                  </Link>
                </Box>
              </Flex>
            </Flex>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
}
