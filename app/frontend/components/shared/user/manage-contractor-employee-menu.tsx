import { Button, Menu, MenuButton, MenuList } from '@chakra-ui/react';
import { t } from 'i18next';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { ISearch } from '../../../lib/create-search-model';
import { IUser } from '../../../models/user';
import { useMst } from '../../../setup/root';
import { ManageMenuItemButton } from '../base/manage-menu-item';
import { Can } from './can';
import { useParams } from 'react-router-dom';
import { EmployeeActionConfirmationModal } from '../modals/employee-action-confirmation-modal';

// Main component
interface IManageContractorEmployeeMenuProps<TSearchModel extends ISearch> {
  user: IUser;
  searchModel?: TSearchModel;
  type: 'active' | 'pending' | 'deactivated';
}

export const ManageContractorEmployeeMenu = observer(function ManageContractorEmployeeMenu<
  TSearchModel extends ISearch,
>({ user, searchModel, type }: IManageContractorEmployeeMenuProps<TSearchModel>) {
  const {
    contractorStore: { currentContractor },
  } = useMst();

  const { contractorId } = useParams<{ contractorId: string }>();

  type EmployeeActionMode = 'deactivate' | 'reactivate' | 'revoke' | 'reinvite' | null;

  const [modalState, setModalState] = React.useState<{
    mode: EmployeeActionMode;
    isLoading: boolean;
  }>({ mode: null, isLoading: false });

  const openModal = (mode: Exclude<EmployeeActionMode, null>) => {
    setModalState({ mode, isLoading: false });
  };

  const closeModal = () => {
    setModalState({ mode: null, isLoading: false });
  };

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
          success = await user.reinviteToContractor(contractorId);
          break;
        case 'revoke':
          success = await user.revokeContractorInvite(contractorId);
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
