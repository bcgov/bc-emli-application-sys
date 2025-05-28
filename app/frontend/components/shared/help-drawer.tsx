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
  HStack,
  Link,
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
          aria-label="open help drawer"
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

          <DrawerBody>
            <Flex direction="column" gap={8}>
              <Box>
                <HStack spacing={3} mb={3} alignItems="flex-start">
                  <Box as="span" bg="theme.darkBlue" p={2} borderRadius="full" mt={1}>
                    <Phone size={32} color="white" />
                  </Box>
                  <Box>
                    <Text fontWeight="bold" fontSize="16px" lineHeight="27px" color="greys.homeScreenGrey">
                      {t('site.helpDrawer.phoneTitle')}
                    </Text>
                    <Text fontSize="16px" lineHeight="27px" color="greys.anotherGrey">
                      {t('auth.bcServiceCardInfo.energyCoach.phoneNumber')}
                    </Text>
                    <Text fontSize="16px" lineHeight="27px" color="greys.anotherGrey">
                      {t('site.helpDrawer.phoneHours')}
                    </Text>
                    <Text fontSize="16px" lineHeight="27px" color="greys.anotherGrey">
                      {t('site.helpDrawer.phoneHoursNote')}
                    </Text>
                  </Box>
                </HStack>
              </Box>

              <Box>
                <HStack spacing={3} mb={3}>
                  <Box as="span" bg="theme.darkBlue" p={2} borderRadius="full">
                    <Envelope size={32} color="white" />
                  </Box>
                  <Box>
                    <Text fontWeight="bold" fontSize="16px" lineHeight="27px" color="greys.homeScreenGrey">
                      {t('site.helpDrawer.emailTitle')}
                    </Text>
                    <Link
                      href={`mailto:${t('site.helpDrawer.emailAddress')}`}
                      color="greys.homeScreenGrey"
                      textDecoration="underline"
                      fontSize="16px"
                      lineHeight="27px"
                    >
                      {t('site.helpDrawer.emailAddress')}
                    </Link>
                  </Box>
                </HStack>
              </Box>
            </Flex>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
}
