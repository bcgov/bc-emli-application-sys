import { Button, Menu, MenuButton, MenuList } from '@chakra-ui/react';
import { Archive, CheckCircle, Envelope, WarningCircle } from '@phosphor-icons/react';
import { t } from 'i18next';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useForm } from 'react-hook-form';
import { ISearch } from '../../../lib/create-search-model';
import { IUser } from '../../../models/user';
import { useMst } from '../../../setup/root';
import { EFlashMessageStatus } from '../../../types/enums';
import { ManageMenuItemButton } from '../base/manage-menu-item';
import { Can } from './can';
import { useParams } from 'react-router-dom';

// Reinvite Employee Form
interface IFormProps {
  user: IUser;
}

const ReinviteEmployeeForm = ({ user }: IFormProps) => {
  const { handleSubmit, formState } = useForm();
  const { isSubmitting } = formState;
  const { contractorId } = useParams<{ contractorId: string }>();
  const { environment } = useMst();

  const onSubmit = async () => {
    await environment.api.reinviteContractorEmployee(contractorId!, user.id);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <ManageMenuItemButton
        color="text.primary"
        type="submit"
        leftIcon={<Envelope size={16} />}
        isLoading={isSubmitting}
        isDisabled={isSubmitting}
      >
        {t('contractor.employees.actions.reinviteToProgram')}
      </ManageMenuItemButton>
    </form>
  );
};

// Main component
interface IManageContractorEmployeeMenuProps<TSearchModel extends ISearch> {
  user: IUser;
  searchModel?: TSearchModel;
  type: 'active' | 'pending' | 'removed';
}

export const ManageContractorEmployeeMenu = observer(function ManageContractorEmployeeMenu<
  TSearchModel extends ISearch,
>({ user, searchModel, type }: IManageContractorEmployeeMenuProps<TSearchModel>) {
  const {
    contractorStore: { currentContractor },
    uiStore,
    environment,
  } = useMst();

  const { contractorId } = useParams<{ contractorId: string }>();

  const handleRemove = async () => {
    if (
      window.confirm(
        t(
          'contractor.employees.actions.confirmRemove',
          'Are you sure you want to remove this employee from the program?',
        ),
      )
    ) {
      await environment.api.removeContractorEmployee(contractorId!, user.id);
      uiStore.flashMessage.show(EFlashMessageStatus.success, 'Employee removed from program', '');
      searchModel?.search();
    }
  };

  const handleReactivate = async () => {
    if (
      window.confirm(
        t('contractor.employees.actions.confirmReactivate', 'Are you sure you want to reactivate this employee?'),
      )
    ) {
      await environment.api.reactivateContractorEmployee(contractorId!, user.id);
      uiStore.flashMessage.show(EFlashMessageStatus.success, 'Employee reactivated', '');
      searchModel?.search();
    }
  };

  const handleRevokeInvite = async () => {
    if (
      window.confirm(
        t('contractor.employees.actions.confirmRevoke', "Are you sure you want to revoke this employee's invite?"),
      )
    ) {
      await environment.api.revokeContractorEmployeeInvite(contractorId!, user.id);
      uiStore.flashMessage.show(EFlashMessageStatus.success, 'Employee invite revoked', '');
      searchModel?.search();
    }
  };

  return (
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
                  <ManageMenuItemButton color="semantic.error" onClick={handleRemove} leftIcon={<Archive size={16} />}>
                    {t('contractor.employees.actions.removeFromProgram')}
                  </ManageMenuItemButton>
                </MenuList>
              );
            case 'removed':
              return (
                <MenuList>
                  <ManageMenuItemButton
                    color="text.primary"
                    onClick={handleReactivate}
                    leftIcon={<CheckCircle size={16} />}
                  >
                    {t('contractor.employees.actions.reactivateEmployee')}
                  </ManageMenuItemButton>
                </MenuList>
              );
            case 'pending':
              return (
                <MenuList>
                  <ReinviteEmployeeForm user={user} />
                  <ManageMenuItemButton
                    color="semantic.error"
                    onClick={handleRevokeInvite}
                    leftIcon={<WarningCircle size={16} />}
                  >
                    {t('contractor.employees.actions.revokeInvite')}
                  </ManageMenuItemButton>
                </MenuList>
              );
            default:
              return null;
          }
        })()}
      </Menu>
    </Can>
  );
});
