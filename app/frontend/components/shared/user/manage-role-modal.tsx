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
import { EFlashMessageStatus, EUserRoles } from '../../../types/enums';
import { useMst } from '../../../setup/root';
import { toTitleCase } from '../../../utils/utility-functions';

interface ManageRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: IUser;
}

export const ManageRoleModal = ({ isOpen, onClose, user }: ManageRoleModalProps) => {
  const [selectedRole, setSelectedRole] = React.useState(user.role);
  const [isSaving, setIsSaving] = React.useState(false);
  const { uiStore, userStore } = useMst();
  const currentUser = userStore.currentUser;

  const assignableRoles = currentUser.isAdminManager
    ? [EUserRoles.adminManager, EUserRoles.admin]
    : [EUserRoles.adminManager, EUserRoles.admin, EUserRoles.systemAdmin];

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await user.changeRole(selectedRole);
      uiStore.flashMessage.show(EFlashMessageStatus.success, t('user.changeRoleModal.success'), '');
      userStore?.search();
      onClose();
    } catch (error) {
      console.error('Failed to update role', error);
      uiStore.flashMessage.show(EFlashMessageStatus.error, t('user.changeRoleModal.failure'), '');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="md">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{t('user.changeRoleModal.title')}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Box fontWeight="bold">
            {user.firstName} {user.lastName}
          </Box>
          <Box mt={2}>({user.email})</Box>
          <Box height="1rem" />
          <FormControl>
            <FormLabel fontWeight="bold">{t('user.changeRoleModal.selectionLabel')}</FormLabel>
            <Select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value as EUserRoles)}>
              {assignableRoles.map((role) => (
                <option key={role} value={role}>
                  {toTitleCase(role)}
                </option>
              ))}
            </Select>
          </FormControl>
        </ModalBody>
        <ModalFooter>
          <Flex w="100%" justifyContent="space-between" alignItems="center">
            <Button
              colorScheme="blue"
              onClick={handleSave}
              isLoading={isSaving}
              isDisabled={!selectedRole || selectedRole === user.role} // disable if no change
            >
              {t('ui.save')}
            </Button>
            <Button onClick={onClose}>{t('ui.cancel')}</Button>
          </Flex>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
