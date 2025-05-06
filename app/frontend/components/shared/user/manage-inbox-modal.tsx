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
  FormControl,
  FormLabel,
} from '@chakra-ui/react';
import { t } from 'i18next';
import React, { useState } from 'react';
import { IUser } from '../../../models/user';
import { MultiCheckSelect } from '../select/multi-check-select';

import { ClassificationPresetName, classificationPresets } from '../../../models/program-classification';
import { useMst } from '../../../setup/root';
import { EFlashMessageStatus } from '../../../types/enums';

interface ManageInboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: IUser;
}

function getUserInboxTypes(user: IUser): ClassificationPresetName[] {
  const types = new Set<ClassificationPresetName>();

  user.programMemberships?.forEach((membership) => {
    membership.classifications?.forEach((classification) => {
      if (classification.presetLabel) {
        types.add(classification.presetLabel);
      }
    });
  });

  return Array.from(types);
}

export const ManageInboxModal = ({ isOpen, onClose, user }: ManageInboxModalProps) => {
  const [selectedInboxes, setSelectedInboxes] = useState<ClassificationPresetName[]>(getUserInboxTypes(user));
  const [isSaving, setIsSaving] = React.useState(false);
  const {
    uiStore,
    userStore,
    programStore: { currentProgram },
  } = useMst();

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await user.syncClassifications(currentProgram.id, selectedInboxes);
      uiStore.flashMessage.show(EFlashMessageStatus.success, t('user.changeInboxModal.success'), '');
      userStore?.search();
      onClose();
    } catch (error) {
      console.error('Failed to update inboxes', error);
      uiStore.flashMessage.show(EFlashMessageStatus.error, t('user.changeInboxModal.failure'), '');
    } finally {
      setIsSaving(false);
    }
  };

  const allInboxOptions = Object.keys(classificationPresets).map((label) => ({
    label,
    value: label as ClassificationPresetName,
  }));

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
            <MultiCheckSelect
              setSelectedValues={setSelectedInboxes}
              selectedValues={selectedInboxes}
              allItems={allInboxOptions}
            />
          </FormControl>
        </ModalBody>
        <ModalFooter>
          <Flex w="100%" justifyContent="space-between" alignItems="center">
            <Button colorScheme="blue" onClick={handleSave}>
              {t('ui.save')}
            </Button>
            <Button onClick={onClose}>{t('ui.cancel')}</Button>
          </Flex>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
