import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Checkbox,
  Text,
  Flex,
  Avatar,
  AvatarGroup,
  useDisclosure,
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import React from 'react';
import { useTranslation } from 'react-i18next';

export default function CollectionConsentModal({ isOpen, onClose, setRevisionMode, permitApplication }) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [originalStatus, setOriginalStatus] = useState(null);
  const { t } = useTranslation();

  // Reset acknowledged state and store original status when modal opens
  useEffect(() => {
    if (isOpen && permitApplication?.status !== 'revisions_requested') {
      setAcknowledged(false);
      // Store the original status so we can restore it if user cancels
      setOriginalStatus(permitApplication?.status);
    }
  }, [isOpen, permitApplication?.status]);

  const handleNext = async () => {
    setRevisionMode(true); // Enable field editing
    onClose(true); // Close all modals with confirmation
  };

  const handleBack = () => {
    onClose(false); // Close modals without enabling revision mode
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent textAlign="center" pt={4} pb={4} px={3} maxW="600px">
          <ModalHeader fontWeight="bold" fontSize="lg" mt={2} color="theme.blueAlt">
            {t('energySavingsApplication.consent.title')}
          </ModalHeader>

          <ModalBody>
            <Checkbox isChecked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)}>
              {t('energySavingsApplication.consent.acknowledgement')}
            </Checkbox>
          </ModalBody>

          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={handleNext} isDisabled={!acknowledged}>
              {t('ui.next')}
            </Button>
            <Button variant="outline" onClick={handleBack}>
              {t('ui.back')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
