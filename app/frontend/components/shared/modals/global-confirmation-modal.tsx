import {
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
} from '@chakra-ui/react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { WarningIcon, CheckCircleIcon, InfoIcon, XCircleIcon } from '@phosphor-icons/react';
import { EFlashMessageStatus } from '../../../types/enums';

interface IProps {
  status?: EFlashMessageStatus;
  bodyText?: string;
  headerText: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: () => void;
  hideActions?: boolean;
  confirmText?: string;
  cancelText?: string;
  closeOnOverlayClick?: boolean;
  children?: React.ReactNode;
}

export const GlobalConfirmationModal = observer(function GlobalConfirmationModal({
  status,
  bodyText,
  headerText,
  isOpen,
  onSubmit,
  onClose,
  hideActions,
  confirmText,
  cancelText,
  closeOnOverlayClick,
  children,
}: IProps) {
  const { t } = useTranslation();

  const statusConfig = {
    [EFlashMessageStatus.warning]: {
      color: 'theme.orange',
      bg: 'semantic.warningLight',
      Icon: WarningIcon,
    },
    [EFlashMessageStatus.success]: {
      color: 'semantic.success',
      bg: 'semantic.successLight',
      Icon: CheckCircleIcon,
    },
    [EFlashMessageStatus.info]: {
      color: 'theme.blue',
      bg: 'semantic.infoLight',
      Icon: InfoIcon,
    },
    [EFlashMessageStatus.error]: {
      color: 'semantic.error',
      bg: 'semantic.errorLight',
      Icon: XCircleIcon,
    },
  };

  const config = status ? statusConfig[status] : undefined;
  const isStatusMode = Boolean(config);

  return (
    <Modal onClose={onClose} isOpen={isOpen} size="xl" closeOnOverlayClick={closeOnOverlayClick ?? true}>
      <ModalOverlay />
      <ModalContent border={0} borderColor="background.sandboxBase">
        <ModalHeader>
          <ModalCloseButton fontSize="11px" />
        </ModalHeader>
        <ModalBody py={8} px={8} paddingTop={4}>
          <Flex direction="column">
            <Heading as="h3" fontSize="2xl" marginBottom={4}>
              {headerText}
            </Heading>

            {isStatusMode && (children || bodyText) ? (
              <Box
                borderRadius="md"
                border="1px solid"
                borderColor={config!.color}
                backgroundColor={config!.bg}
                px={6}
                py={3}
              >
                <HStack spacing={4}>
                  <Box color={config!.color} alignSelf="start">
                    <config.Icon size={24} aria-label={`${status} icon`} />
                  </Box>

                  {/* Show children if provided; otherwise show bodyText */}
                  <Box>{children || <Text>{bodyText}</Text>}</Box>
                </HStack>
              </Box>
            ) : (
              <Box py={4} marginBottom={4}>
                {children ? children : <Text>{bodyText}</Text>}
              </Box>
            )}

            {!hideActions && (
              <Flex justify="center" gap={6}>
                {onSubmit && (
                  <Button width={'10rem'} onClick={onSubmit} variant="primary">
                    {confirmText || t('ui.confirm')}
                  </Button>
                )}
                {onClose && (
                  <Button width={'10rem'} onClick={onClose} variant="secondary">
                    {cancelText || t('ui.cancel')}
                  </Button>
                )}
              </Flex>
            )}
          </Flex>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
});
