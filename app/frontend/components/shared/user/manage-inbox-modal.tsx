import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Button,
  Flex,
  Box,
  Select,
  FormControl,
  FormLabel,
} from '@chakra-ui/react';
import { t } from 'i18next';
import React from 'react';
import { IUser } from '../../../models/user';

interface ManageInboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: IUser;
}

export const ManageInboxModal = ({ isOpen, onClose, user }: ManageInboxModalProps) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="md">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{t('user.changeInboxModal.title')}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Box fontWeight="bold">
            {user.firstName} {user.lastName}
          </Box>
          <Box mt={2}>({user.email})</Box>
          <Box height="1rem" />
          <FormControl>
            <FormLabel fontWeight="bold">{t('user.changeInboxModal.selectionLabel')}</FormLabel>
            <Select>
              <option value="1">Contractor</option>
              <option value="2">Participant</option>
              <option value="3">Onboarding</option>
            </Select>
          </FormControl>
        </ModalBody>
        <ModalFooter>
          <Flex w="100%" justifyContent="space-between" alignItems="center">
            <Button colorScheme="blue" onClick={() => console.log('Save role')}>
              {t('ui.save')}
            </Button>
            <Button onClick={onClose}>{t('ui.cancel')}</Button>
          </Flex>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
