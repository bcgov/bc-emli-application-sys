import {
  Button,
  Flex,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  useDisclosure,
} from '@chakra-ui/react';
import React, { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface IConfirmationModalProps {
  isSubmit?: boolean; // Optional prop to indicate if the modal is for a submit action
  onConfirm: () => void; // Function type for the confirmation action
  promptMessage?: string;
  promptHeader?: string;
  renderTrigger?: (onOpen: () => void) => ReactNode;
}

export const ConfirmationModal = ({
  isSubmit,
  onConfirm,
  promptMessage,
  promptHeader,
  renderTrigger,
}: IConfirmationModalProps) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { t } = useTranslation();

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <>
      {renderTrigger ? (
        renderTrigger(onOpen)
      ) : (
        <Button onClick={onOpen} variant="whiteButton">
          {isSubmit ? t('ui.confirm') : t('ui.cancel')}
        </Button>
      )}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent p={4}>
          <ModalHeader color="#005C97">{promptHeader ?? t('ui.confirmation')}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>{promptMessage ?? t('ui.confirm')}</ModalBody>
          <ModalFooter>
            <Flex justify="flex-start" w="full" gap={4}>
              <Button variant="primary" onClick={handleConfirm}>
                {isSubmit ? t('ui.confirm') : 'Cancel update request'}
              </Button>
              <Button variant="secondary" onClick={handleCancel}>
                {t('ui.neverMind')}
              </Button>
            </Flex>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default ConfirmationModal;
