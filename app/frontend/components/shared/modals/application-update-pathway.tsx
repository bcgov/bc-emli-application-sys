import React, { useState } from 'react';
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

const UpdatePathwayModal = ({ isOpen, onClose, setRevisionMode }) => {
  const [selectedOption, setSelectedOption] = useState('');
  const { t } = useTranslation();

  const handleSelectChange = (e) => {
    setSelectedOption(e.target.value);
  };

  const handleNext = () => {
    console.log('Selected option:', selectedOption);
    setRevisionMode(true);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader color="blue.700"> {t('energySavingsApplication.show.updatePathway')}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Text mb={2}>{t('energySavingsApplication.show.performedBy')}</Text>
          <Select placeholder="Select" onChange={handleSelectChange}>
            <option value="applicant">{t('energySavingsApplication.show.applicant')}</option>
            <option value="staff">{t('energySavingsApplication.show.staff')}</option>
          </Select>
        </ModalBody>

        <ModalFooter>
          <Button colorScheme="blue" mr={3} onClick={handleNext} isDisabled={!selectedOption}>
            {t('ui.next')}
          </Button>
          <Button variant="outline" onClick={onClose}>
            {t('ui.back')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default UpdatePathwayModal;
