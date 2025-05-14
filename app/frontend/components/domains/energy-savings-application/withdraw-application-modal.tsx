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
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';

interface WithdrawApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const WithdrawApplicationModal = ({ isOpen, onClose, onConfirm }: WithdrawApplicationModalProps) => {
  const { t } = useTranslation();

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent maxW="604px">
        <ModalCloseButton size="sm" color="greys.grey01" />
        <ModalHeader>{t('permitApplication.withdraw.confirmTitle')}</ModalHeader>
        <ModalBody>{t('permitApplication.withdraw.confirmMessage')}</ModalBody>
        <ModalFooter justifyContent="center">
          <Button bg="theme.darkBlue" color="white" _hover={{ bg: 'theme.blueButtonHover' }} mr={3} onClick={onConfirm}>
            {t('permitApplication.withdraw.confirm')}
          </Button>
          <Button variant="ghost" onClick={onClose} border="2px" borderColor="border.light">
            {t('ui.cancel')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
