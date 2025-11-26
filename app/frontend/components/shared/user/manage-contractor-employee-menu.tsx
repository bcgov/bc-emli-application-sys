import { Button, Menu, MenuButton, MenuList } from '@chakra-ui/react';
import { t } from 'i18next';
import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { IUser } from '../../../models/user';
import { useMst } from '../../../setup/root';
import { ManageMenuItemButton } from '../base/manage-menu-item';
import { Can } from './can';
import { useParams } from 'react-router-dom';
import { EmployeeActionConfirmationModal } from '../modals/employee-action-confirmation-modal';

// Main component
interface IManageContractorEmployeeMenuProps {
  user: IUser;
  type: 'active' | 'pending' | 'deactivated';
}

export const ManageContractorEmployeeMenu = observer(function ManageContractorEmployeeMenu({
  user,
  type,
}: IManageContractorEmployeeMenuProps) {
  const {
    contractorStore: { currentContractor },
    userStore: { currentUser, fetchActivePrograms },
    environment,
  } = useMst();

  const { contractorId } = useParams<{ contractorId: string }>();

  type EmployeeActionMode = 'deactivate' | 'reactivate' | 'revoke' | 'reinvite' | 'setPrimaryContact' | null;

  const [modalState, setModalState] = React.useState<{
    mode: EmployeeActionMode;
    isLoading: boolean;
  }>({ mode: null, isLoading: false });

  // Fetch active programs on mount
  useEffect(() => {
    fetchActivePrograms();
  }, [fetchActivePrograms]);

  const openModal = (mode: Exclude<EmployeeActionMode, null>) => {
    setModalState({ mode, isLoading: false });
  };

  const closeModal = () => {
    setModalState({ mode: null, isLoading: false });
  };

  // Check if this user is already the primary contact
  const isAlreadyPrimaryContact = currentContractor?.contact?.id === user.id;

  // Early return if contractorId is not available
  if (!contractorId) {
    console.error('ContractorId is required for contractor employee management');
    return null;
  }

  const handleConfirmAction = async () => {
    if (!modalState.mode) return;

    setModalState((prev) => ({ ...prev, isLoading: true }));

    try {
      let success = false;
      switch (modalState.mode) {
        case 'deactivate':
          success = await user.deactivateFromContractor(contractorId);
          break;
        case 'reactivate':
          success = await user.reactivateInContractor(contractorId);
          break;
        case 'reinvite':
          // Get program_id from current user's active programs
          const activePrograms = currentUser?.activePrograms;
          if (!activePrograms || activePrograms.length === 0) {
            console.error('No active programs found for current user');
            break;
          }
          const programId = activePrograms[0]?.program?.id;
          if (!programId) {
            console.error('Could not extract program ID');
            break;
          }
          const response = await environment.api.reinviteContractorEmployee(contractorId, user.id, programId);
          if (response.ok) {
            await user.rootStore.userStore.searchUsers({ reset: false });
          }
          success = response.ok;
          break;
        case 'revoke':
          success = await user.revokeContractorInvite(contractorId);
          break;
        case 'setPrimaryContact':
          const setPrimaryResponse = await environment.api.setPrimaryContact(contractorId, user.id);
          if (setPrimaryResponse.ok) {
            // Reload contractor to get updated contact information
            await currentContractor?.reload();
            // Refresh the employee list to update the UI
            await user.rootStore.userStore.searchUsers({ reset: false });
          }
          success = setPrimaryResponse.ok;
          break;
      }
      if (success) {
        closeModal();
      }
    } catch (error) {
      console.error(`Failed to ${modalState.mode} employee:`, error);
    } finally {
      setModalState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  return (
    <>
      <Can action="contractor:manage" data={{ contractor: currentContractor }}>
        <Menu>
          <MenuButton as={Button} variant="link">
            {t('ui.manage')}
          </MenuButton>
          {(() => {
            switch (type) {
              case 'active':
                return (
                  <MenuList>
                    <ManageMenuItemButton
                      color="text.primary"
                      onClick={() => openModal('setPrimaryContact')}
                      isDisabled={isAlreadyPrimaryContact}
                      aria-disabled={isAlreadyPrimaryContact}
                      _disabled={{
                        opacity: 0.6,
                        pointerEvents: 'none',
                      }}
                    >
                      {t('contractor.employees.actions.setPrimaryContact')}
                    </ManageMenuItemButton>
                    <ManageMenuItemButton color="semantic.error" onClick={() => openModal('deactivate')}>
                      {t('contractor.employees.actions.deactivateEmployee')}
                    </ManageMenuItemButton>
                  </MenuList>
                );
              case 'deactivated':
                return (
                  <MenuList>
                    <ManageMenuItemButton color="text.primary" onClick={() => openModal('reactivate')}>
                      {t('contractor.employees.actions.reactivateEmployee')}
                    </ManageMenuItemButton>
                  </MenuList>
                );
              case 'pending':
                return (
                  <MenuList>
                    <ManageMenuItemButton color="text.primary" onClick={() => openModal('reinvite')}>
                      {t('contractor.employees.actions.reinviteEmployee')}
                    </ManageMenuItemButton>
                    <ManageMenuItemButton
                      color="semantic.error"
                      onClick={() => openModal('revoke')}
                      isDisabled={!user.hasPendingInvitation}
                      aria-disabled={!user.hasPendingInvitation}
                      _disabled={{
                        opacity: 0.6,
                        pointerEvents: 'none',
                      }}
                    >
                      {t('contractor.employees.actions.revokeEmployeeInvite')}
                    </ManageMenuItemButton>
                  </MenuList>
                );
              default:
                return null;
            }
          })()}
        </Menu>
      </Can>

      {modalState.mode && (
        <EmployeeActionConfirmationModal
          isOpen={true}
          onClose={closeModal}
          onConfirm={handleConfirmAction}
          user={user}
          mode={modalState.mode}
          isLoading={modalState.isLoading}
        />
      )}
    </>
  );
});
