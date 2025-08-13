import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  Text,
  Flex,
} from '@chakra-ui/react';
import React from 'react';
import { useTranslation } from 'react-i18next';

interface ISaveConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export const SaveConfirmationModal: React.FC<ISaveConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}) => {
  const { t } = useTranslation();

  const handleConfirm = () => {
    onConfirm();
  };

  const handleBack = () => {
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered closeOnOverlayClick={false}>
      <ModalOverlay />
      <ModalContent
        maxW="540px"
        w="540px"
        h="295px"
        p="40px"
        borderRadius="6px"
        boxShadow="0px 0px 2px rgba(0, 0, 0, 0.05), 0px 8px 15px rgba(0, 0, 0, 0.08)"
      >
        <ModalCloseButton
          position="absolute"
          right="5px"
          top="5px"
          w="28px"
          h="28px"
          borderRadius="4px"
          fontSize="16px"
          color="#2D2D2D"
        />

        <ModalHeader p={0} mb="24px">
          <Text fontFamily="BC Sans" fontWeight="700" fontSize="24px" lineHeight="36px" color="#005C97" w="460px">
            {t('energySavingsApplication.show.saveConfirmation.title')}
          </Text>
        </ModalHeader>

        <ModalBody p={0} mb="24px">
          <Text fontFamily="BC Sans" fontWeight="400" fontSize="16px" lineHeight="27px" color="#2D2D2D" w="460px">
            {t('energySavingsApplication.show.saveConfirmation.description')}
          </Text>
        </ModalBody>

        <ModalFooter p={0}>
          <Flex gap="16px" w="460px" alignItems="flex-start">
            <Button
              w="100px"
              h="40px"
              bg="#013366"
              color="#FFFFFF"
              fontFamily="BC Sans"
              fontWeight="400"
              fontSize="16px"
              lineHeight="27px"
              borderRadius="4px"
              _hover={{ bg: '#012244' }}
              _active={{ bg: '#012244' }}
              onClick={handleConfirm}
              isLoading={isLoading}
              loadingText={t('ui.saving')}
            >
              {t('energySavingsApplication.show.saveConfirmation.confirm')}
            </Button>

            <Button
              w="112px"
              h="40px"
              bg="#FFFFFF"
              color="#2D2D2D"
              fontFamily="BC Sans"
              fontWeight="400"
              fontSize="16px"
              lineHeight="27px"
              border="1px solid #353433"
              borderRadius="4px"
              _hover={{ bg: '#F5F5F5' }}
              _active={{ bg: '#F5F5F5' }}
              onClick={handleBack}
              isDisabled={isLoading}
            >
              {t('energySavingsApplication.show.saveConfirmation.back')}
            </Button>
          </Flex>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default SaveConfirmationModal;
