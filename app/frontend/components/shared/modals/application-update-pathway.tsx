import React, { useEffect, useState } from 'react';
import {
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Select,
  useDisclosure,
  Text,
  Box,
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import CollectionConsentModal from './consent-modal';
import { EUpdateRoles } from '../../../types/enums';

const UpdatePathwayModal = ({ isOpen, onClose, setRevisionMode, setPerformedBy }) => {
  const { t } = useTranslation();

  const [selectedOption, setSelectedOption] = useState(null);

  const handleSelectChange = (e) => {
    const selectedValue = e.target.value;
    setSelectedOption(selectedValue);
    setPerformedBy(selectedValue); // Pass selected value to parent component
  };

  const [isCollectionConsentModalOpen, setCollectionConsentModalOpen] = useState(false);

  const handleNext = () => {
    if (selectedOption === EUpdateRoles.staff) {
      setCollectionConsentModalOpen(true); // Open CollectionConsentModal
      setRevisionMode(false);
    } else {
      setRevisionMode(true);
      onClose();
    }
  };

  const onCollectionConsentModalClose = () => {
    setCollectionConsentModalOpen(false);
    onClose();
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader color="blue.700"> {t('energySavingsApplication.show.updatePathway')}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text mb={2}>{t('energySavingsApplication.show.performedBy')}</Text>
            <Select placeholder="Select" onChange={handleSelectChange}>
              {Object.entries(EUpdateRoles).map(([key, value]) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </Select>
          </ModalBody>

          <ModalFooter>
            <Button variant="primary" mr={3} onClick={handleNext} isDisabled={!selectedOption}>
              {t('ui.next')}
            </Button>
            <Button variant="outline" onClick={onClose}>
              {t('ui.back')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <CollectionConsentModal
        isOpen={isCollectionConsentModalOpen}
        onClose={onCollectionConsentModalClose}
        setRevisionMode={setRevisionMode}
      />
    </>
  );
};

export default UpdatePathwayModal;
