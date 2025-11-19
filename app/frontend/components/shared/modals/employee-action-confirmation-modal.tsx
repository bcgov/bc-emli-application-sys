import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  Alert,
  Text,
  Box,
} from '@chakra-ui/react';
import { Warning } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { IUser } from '../../../models/user';

interface EmployeeActionConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  user: IUser;
  mode?: 'deactivate' | 'reactivate' | 'revoke' | 'reinvite' | 'setPrimaryContact';
  isLoading?: boolean;
}

export const EmployeeActionConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  user,
  mode = 'deactivate',
  isLoading = false,
}: EmployeeActionConfirmationModalProps) => {
  const { t } = useTranslation();
  const userName = user.name || user.firstName || user.lastName || t('contractor.employees.unknownEmployee');

  const modalConfig = {
    reinvite: {
      titleKey: 'confirmReinviteTitle',
      warningKey: 'reinviteWarning',
      warningDefault: `${userName} will receive another invite email when\nyou re-invite them.`,
      buttonTextKey: 'ui.reinvite',
    },
    revoke: {
      titleKey: 'confirmRevokeTitle',
      warningKey: 'revokeWarning',
      warningDefault: `${userName} will no longer be able to create an account if you revoke this invite.`,
      buttonTextKey: 'ui.revoke',
    },
    reactivate: {
      titleKey: 'confirmReactivateTitle',
      warningKey: 'reactivateWarning',
      warningDefault: `${userName} will be able to access the application system again when you reactivate their account.`,
      buttonTextKey: 'ui.reactivate',
    },
    deactivate: {
      titleKey: 'confirmDeactivateTitle',
      warningKey: 'deactivateWarning',
      warningDefault: `${userName} will not be able to access the application system until you reactivate them.`,
      buttonTextKey: 'ui.deactivate',
    },
    setPrimaryContact: {
      titleKey: 'confirmSetPrimaryContactTitle',
      warningKey: 'setPrimaryContactWarning',
      warningDefault: `${userName} will be set as the primary contact for this contractor.`,
      buttonTextKey: 'Set Primary Contact',
    },
  };

  const config = modalConfig[mode];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      isCentered
      aria-labelledby={`${mode}-modal-title`}
      aria-describedby={`${mode}-modal-description`}
    >
      <ModalOverlay />
      <ModalContent maxW="604px">
        <ModalCloseButton size="sm" color="greys.anotherGrey" aria-label={t('ui.close')} />
        <ModalHeader
          id={`${mode}-modal-title`}
          fontFamily="'BC Sans'"
          fontWeight="700"
          fontSize="24px"
          color="theme.blueAlt"
          whiteSpace="pre-line"
        >
          {mode === 'setPrimaryContact'
            ? `Set ${userName} as Primary Contact`
            : t(`contractor.employees.actions.${config.titleKey}`, { name: userName })}
        </ModalHeader>
        <ModalBody px="32px">
          <Alert
            status="warning"
            bg="theme.orangeLight02"
            border="1px solid"
            borderColor="theme.orange"
            borderRadius="8px"
            alignItems="flex-start"
          >
            <Box color="theme.orange" flexShrink={0} mr={2}>
              <Warning size={27} />
            </Box>
            <Text
              id={`${mode}-modal-description`}
              fontFamily="'BC Sans'"
              fontSize="16px"
              color="greys.anotherGrey"
              whiteSpace="pre-line"
            >
              {mode === 'setPrimaryContact'
                ? config.warningDefault
                : t(`contractor.employees.actions.${config.warningKey}`, {
                    name: userName,
                    defaultValue: config.warningDefault,
                  })}
            </Text>
          </Alert>
        </ModalBody>
        <ModalFooter justifyContent="center" gap="24px">
          <Button
            w="155px"
            h="40px"
            bg="theme.darkBlue"
            color="greys.white"
            _hover={{ bg: 'theme.darkBlue' }}
            _active={{ bg: 'theme.darkBlue' }}
            onClick={onConfirm}
            isLoading={isLoading}
            isDisabled={isLoading}
            loadingText={mode === 'setPrimaryContact' ? config.buttonTextKey : t(config.buttonTextKey)}
          >
            {mode === 'setPrimaryContact' ? config.buttonTextKey : t(config.buttonTextKey)}
          </Button>
          <Button
            w="155px"
            h="40px"
            bg="greys.white"
            color="greys.anotherGrey"
            border="1px solid"
            borderColor="border.randomBorderColorforthePublishModal"
            _hover={{ bg: 'greys.white' }}
            _active={{ bg: 'greys.white' }}
            onClick={onClose}
            isDisabled={isLoading}
          >
            {t('ui.cancel')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
