import React from 'react';
import { Box, Flex } from '@chakra-ui/react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { AddressBook } from '@phosphor-icons/react';
import { IUser } from '../../../../models/user';
import { SearchGridItem } from '../../../shared/grid/search-grid-item';
import { IUserStore } from '../../../../stores/user-store';
import { ManageContractorEmployeeMenu } from '../../../shared/user/manage-contractor-employee-menu';
import { useMst } from '../../../../setup/root';

interface SimpleEmployeeRowProps {
  user: IUser;
  userStore: IUserStore;
}

export function SimpleEmployeeRow({ user, userStore }: SimpleEmployeeRowProps) {
  const { t } = useTranslation();
  const { contractorStore } = useMst();
  const { currentContractor } = contractorStore;

  const isPrimaryContact = currentContractor?.contact?.id === user.id;

  const formatDate = (date: Date | null) => {
    if (!date) return '-';
    const d = new Date(date);
    const dateStr = format(d, 'yyyy-MM-dd');
    const timeStr = format(d, 'HH:mm');
    return `${dateStr}\n${timeStr}`;
  };

  return (
    <Box key={user.id} className="simple-employee-index-grid-row" role="row" display="contents">
      <SearchGridItem fontSize="sm" headers="employee-name-header">
        <Flex alignItems="center" gap={2}>
          {isPrimaryContact && (
            <AddressBook size={16} aria-label={t('contractor.employees.primaryContact')} />
          )}
          {user.name || user.firstName || t('contractor.employees.unknownEmployee')}
        </Flex>
      </SearchGridItem>
      <SearchGridItem fontSize="sm" headers="employee-email-header">
        {user.email || '-'}
      </SearchGridItem>
      <SearchGridItem fontSize="sm" style={{ whiteSpace: 'pre-line' }} headers="employee-updated-header">
        {formatDate(user.updatedAt)}
      </SearchGridItem>
      <SearchGridItem headers="employee-action-header">
        <Flex justify="center">
          <ManageContractorEmployeeMenu user={user} type={userStore.status} />
        </Flex>
      </SearchGridItem>
    </Box>
  );
}
