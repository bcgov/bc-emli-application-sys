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

const UpdatePathwayModal = ({ isOpen, onClose, setRevisionMode }) => {
  const [selectedOption, setSelectedOption] = useState('');

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
        <ModalHeader color="blue.700">Update pathway</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Text mb={2}>Update performed by</Text>
          <Select placeholder="Select" onChange={handleSelectChange}>
            <option value="applicant">{'{applicant}'}</option>
            <option value="staff">Staff</option>
          </Select>
        </ModalBody>

        <ModalFooter>
          <Button colorScheme="blue" mr={3} onClick={handleNext} isDisabled={!selectedOption}>
            Next
          </Button>
          <Button variant="outline" onClick={onClose}>
            Back
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default UpdatePathwayModal;
