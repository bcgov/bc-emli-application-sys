import React from 'react';
import { Box, Flex } from '@chakra-ui/react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { IUser } from '../../../../models/user';
import { RoleTag } from '../../../shared/user/role-tag';
import { ManageUserMenu } from '../../../shared/user/manage-user-menu';
import { SearchGridItem } from '../../../shared/grid/search-grid-item';
import { IUserStore } from '../../../../stores/user-store';
import { ISearch } from '../../../../lib/create-search-model';

interface UserRowProps {
  user: IUser;
  userStore: IUserStore;
}

/** Active User Row */
export function ActiveUserRow({ user, userStore }: UserRowProps) {
  const { t } = useTranslation();

  return (
    <Box key={user.id} className="user-index-grid-row" role="row" display="contents">
      <SearchGridItem fontSize="sm" maxWidth="300px" sx={{ wordBreak: 'break-word' }}>
        {user.name}
      </SearchGridItem>
      <SearchGridItem fontSize="sm">{user.email}</SearchGridItem>
      <SearchGridItem fontWeight={700}>
        <RoleTag role={user.role} />
      </SearchGridItem>
      <SearchGridItem fontSize="sm">{''}</SearchGridItem>
      <SearchGridItem fontSize="sm">{format(user.createdAt, 'yyyy-MM-dd')}</SearchGridItem>
      <SearchGridItem fontSize="sm">
        {user.lastSignInAt ? format(user.lastSignInAt, 'yyyy-MM-dd') : t('ui.never')}
      </SearchGridItem>
      <SearchGridItem>
        <Flex justify="space-between" w="full">
          <ManageUserMenu<ISearch> user={user} searchModel={userStore as ISearch} type="active" />
        </Flex>
      </SearchGridItem>
    </Box>
  );
}

/** Pending User Row */
export function PendingUserRow({ user, userStore }: UserRowProps) {
  const { t } = useTranslation();
  return (
    <Box key={user.id} className="user-index-grid-row" role="row" display="contents">
      <SearchGridItem fontSize="sm">{user.email}</SearchGridItem>
      <SearchGridItem fontWeight={700}>
        <RoleTag role={user.role} />
      </SearchGridItem>
      <SearchGridItem>{''}</SearchGridItem>
      <SearchGridItem fontSize="sm">{format(user.createdAt, 'yyyy-MM-dd')}</SearchGridItem>
      <SearchGridItem fontSize="sm">
        {user.lastSignInAt ? format(user.lastSignInAt, 'yyyy-MM-dd') : t('ui.never')}
      </SearchGridItem>
      <SearchGridItem>{''}</SearchGridItem>
      <SearchGridItem>
        <Flex justify="space-between" w="full">
          <ManageUserMenu user={user} searchModel={userStore as ISearch} type="pending" />
        </Flex>
      </SearchGridItem>
    </Box>
  );
}

/** Deactivated User Row */
export function DeactivatedUserRow({ user, userStore }: UserRowProps) {
  const { t } = useTranslation();
  return (
    <Box key={user.id} className="user-index-grid-row" role="row" display="contents">
      <SearchGridItem fontSize="sm" maxWidth="200px" sx={{ wordBreak: 'break-word' }}>
        {user.name}
      </SearchGridItem>
      <SearchGridItem fontSize="sm">{user.email}</SearchGridItem>
      <SearchGridItem fontWeight={700}>
        <RoleTag role={user.role} />
      </SearchGridItem>
      <SearchGridItem>{''}</SearchGridItem>
      <SearchGridItem fontSize="sm">{format(user.createdAt, 'yyyy-MM-dd')}</SearchGridItem>
      <SearchGridItem fontSize="sm">
        {user.lastSignInAt ? format(user.lastSignInAt, 'yyyy-MM-dd') : t('ui.never')}
      </SearchGridItem>
      <SearchGridItem>
        <Flex justify="space-between" w="full">
          <ManageUserMenu user={user} searchModel={userStore as ISearch} type="deactivated" />
        </Flex>
      </SearchGridItem>
    </Box>
  );
}
