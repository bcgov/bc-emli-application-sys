import { Button, Menu, MenuButton, MenuList } from '@chakra-ui/react';
import { t } from 'i18next';
import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { IUser } from '../../../models/user';
import { useMst } from '../../../setup/root';
import { ManageMenuItemButton } from '../base/manage-menu-item';
import { Can } from './can';
import { useParams } from 'react-router-dom';
//import { EmployeeActionConfirmationModal } from '../modals/employee-action-confirmation-modal';
import { GlobalConfirmationModal } from '../modals/global-confirmation-modal';
import { EFlashMessageStatus } from '../../../types/enums';

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
    userStore,
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
    userStore.fetchActivePrograms();
  }, [userStore.fetchActivePrograms]);

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

    const success = await userStore.performContractorEmployeeAction(modalState.mode, {
      user,
      contractorId,
    });

    if (success) closeModal();
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

      {modalState.mode &&
        (() => {
          const userName = user.name || user.firstName || user.lastName || t('contractor.employees.unknownEmployee');
          const { header, body, confirmText } = employeeActionConfig(modalState.mode, userName);

          return (
            <GlobalConfirmationModal
              isOpen={true}
              onClose={closeModal}
              onSubmit={handleConfirmAction}
              headerText={header}
              bodyText={body}
              //status={EFlashMessageStatus.warning}
              confirmText={t('ui.confirm')}
              cancelText={t('ui.cancel')}
              closeOnOverlayClick={false}
            />
          );
        })()}
    </>
  );
});

const employeeActionConfig = (mode: EmployeeActionMode, userName: string) => {
  return {
    deactivate: {
      header: t('contractor.employees.actions.confirmDeactivateTitle', { name: userName }),
      body: t('contractor.employees.actions.deactivateWarning', {
        name: userName,
        defaultValue: `${userName} will not be able to access the application system until you reactivate them.`,
      }),
      confirmText: t('ui.confirm'),
    },
    reactivate: {
      header: t('contractor.employees.actions.confirmReactivateTitle', { name: userName }),
      body: t('contractor.employees.actions.reactivateWarning', {
        name: userName,
        defaultValue: `${userName} will be able to access the application system again when you reactivate their account.`,
      }),
      confirmText: t('ui.reactivate'),
    },
    reinvite: {
      header: t('contractor.employees.actions.confirmReinviteTitle', { name: userName }),
      body: t('contractor.employees.actions.reinviteWarning', {
        name: userName,
        defaultValue: `${userName} will receive another invite email when you re-invite them.`,
      }),
      confirmText: t('ui.reinvite'),
    },
    revoke: {
      header: t('contractor.employees.actions.confirmRevokeTitle', { name: userName }),
      body: t('contractor.employees.actions.revokeWarning', {
        name: userName,
        defaultValue: `${userName} will no longer be able to create an account if you revoke this invite.`,
      }),
      confirmText: t('ui.revoke'),
    },
    setPrimaryContact: {
      header: t('contractor.employees.actions.primaryContactTitle', { name: userName }),
      body: t('contractor.employees.actions.primaryContactText', { name: userName }),
      confirmText: 'Set Primary Contact',
    },
  }[mode];
};
