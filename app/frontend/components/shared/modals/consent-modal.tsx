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
import { useState } from 'react';
import React from 'react';
import { useTranslation } from 'react-i18next';

export default function CollectionConsentModal({ isOpen, onClose, setRevisionMode }) {
  const [acknowledged, setAcknowledged] = useState(false);
  const { t } = useTranslation();

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
            <Button
              colorScheme="blue"
              mr={3}
              onClick={() => {
                setRevisionMode(true);
                onClose();
              }}
              isDisabled={!acknowledged}
            >
              {t('ui.next')}
            </Button>
            <Button variant="outline" onClick={onClose}>
              {t('ui.back')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
