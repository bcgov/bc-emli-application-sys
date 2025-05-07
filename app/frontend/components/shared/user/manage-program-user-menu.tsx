import { Button, Flex, Menu, MenuButton, MenuList, useDisclosure } from '@chakra-ui/react';
import {
  Archive,
  ArrowsLeftRight,
  CheckCircle,
  ClockClockwise,
  Envelope,
  PaperPlaneTilt,
  WarningCircle,
} from '@phosphor-icons/react';
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
import { ManageRoleModal } from './manage-role-modal';
import { ManageInboxModal } from './manage-inbox-modal';
import { Console } from 'console';

// First define ReinviteUserForm (optional but cleaner)
interface IFormProps {
  user: IUser;
}

const ReinviteUserForm = ({ user }: IFormProps) => {
  const { handleSubmit, formState } = useForm();
  const { isSubmitting } = formState;

  const onSubmit = async () => await user.reinvite();

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <ManageMenuItemButton
        color="text.primary"
        type="submit"
        leftIcon={<Envelope size={16} />}
        isLoading={isSubmitting}
        isDisabled={isSubmitting}
      >
        {t('user.menuItems.reinviteUser')}
      </ManageMenuItemButton>
    </form>
  );
};

// Then define your main component
interface IManageProgramUserMenuProps<TSearchModel extends ISearch> {
  user: IUser;
  searchModel?: TSearchModel;
  type: 'active' | 'pending' | 'deactivated';
}

export const ManageProgramUserMenu = observer(function ManageProgramUserMenu<TSearchModel extends ISearch>({
  user,
  searchModel,
  type,
}: IManageProgramUserMenuProps<TSearchModel>) {
  const {
    programStore: { currentProgram },
    userStore: { currentUser },
    uiStore,
  } = useMst();

  const { isOpen: isRoleModalOpen, onOpen: openRoleModal, onClose: closeRoleModal } = useDisclosure();

  const { isOpen: isInboxModalOpen, onOpen: openInboxModal, onClose: closeInboxModal } = useDisclosure();

  const handleRemove = async () => {
    const success = await user.removeFromProgram(currentProgram.id);
    if (success) {
      uiStore.flashMessage.show(EFlashMessageStatus.success, 'User deactivated', '');
      searchModel?.search();
    }
  };

  const handleRestore = async () => {
    const success = await user.restoreToProgram(currentProgram.id);
    if (success) {
      uiStore.flashMessage.show(EFlashMessageStatus.success, 'User reactivated', '');
      searchModel?.search();
    }
  };

  const handleChangeRole = async () => {
    openRoleModal();
  };

  const handleChangeInbox = async () => {
    openInboxModal();
  };

  const revokeUserInvite = async () => {
    const success = await user.destroy();
    if (success) {
      //uiStore.flashMessage.show(EFlashMessageStatus.success, 'User reactivated', '');
      searchModel?.search();
    }
  };

  const isCurrentUser = user.id === currentUser.id;

  return (
    <>
      <Can action="program:manage" data={{ program: currentProgram }}>
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
                      color={isCurrentUser ? 'greys.grey01' : 'text.primary'}
                      leftIcon={<ArrowsLeftRight />}
                      onClick={handleChangeRole}
                      isDisabled={isCurrentUser}
                    >
                      {t('user.menuItems.changeUserRole')}
                    </ManageMenuItemButton>
                    <ManageMenuItemButton
                      color={isCurrentUser ? 'greys.grey01' : 'text.primary'}
                      leftIcon={<ArrowsLeftRight />}
                      onClick={handleChangeInbox}
                      isDisabled={isCurrentUser}
                    >
                      {t('user.menuItems.inboxAccess')}
                    </ManageMenuItemButton>

                    <ManageMenuItemButton
                      color={isCurrentUser ? 'greys.grey01' : 'semantic.error'}
                      onClick={handleRemove}
                      leftIcon={<Archive size={16} />}
                      isDisabled={isCurrentUser}
                    >
                      {t('user.menuItems.removeUser')}
                    </ManageMenuItemButton>
                  </MenuList>
                );
              case 'deactivated':
                return (
                  <MenuList>
                    <ManageMenuItemButton
                      color="text.primary"
                      onClick={handleRestore}
                      leftIcon={<CheckCircle size={16} />}
                    >
                      {t('user.menuItems.reactivateUser')}
                    </ManageMenuItemButton>
                  </MenuList>
                );
              case 'pending':
                return (
                  <>
                    <MenuList>
                      {user.isUnconfirmed ? <ReinviteUserForm user={user} /> : null}
                      <ManageMenuItemButton
                        color="text.primary"
                        onClick={revokeUserInvite}
                        leftIcon={<WarningCircle size={16} />}
                      >
                        {t('user.menuItems.revokeUserInvite')}
                      </ManageMenuItemButton>
                    </MenuList>
                  </>
                );
              default:
                return null;
            }
          })()}
        </Menu>
      </Can>
      <ManageRoleModal isOpen={isRoleModalOpen} onClose={closeRoleModal} user={user} />
      <ManageInboxModal isOpen={isInboxModalOpen} onClose={closeInboxModal} user={user} />
    </>
  );
});
