import React from 'react';
import { Box, Flex, Link } from '@chakra-ui/react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { IUser } from '../../../../models/user';
import { SearchGridItem } from '../../../shared/grid/search-grid-item';
import { IUserStore } from '../../../../stores/user-store';

interface SimpleEmployeeRowProps {
  user: IUser;
  userStore: IUserStore;
}

export function SimpleEmployeeRow({ user, userStore }: SimpleEmployeeRowProps) {
  const { t } = useTranslation();

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
        {user.name || t('contractor.employees.unknownEmployee')}
      </SearchGridItem>
      <SearchGridItem fontSize="sm" headers="employee-email-header">
        {user.email || '-'}
      </SearchGridItem>
      <SearchGridItem fontSize="sm" style={{ whiteSpace: 'pre-line' }} headers="employee-updated-header">
        {formatDate(user.updatedAt)}
      </SearchGridItem>
      <SearchGridItem headers="employee-action-header">
        <Flex justify="center">
          <Link
            color="black"
            textDecoration="underline"
            _hover={{ textDecoration: 'underline', color: 'theme.blue' }}
            fontSize="sm"
            fontWeight="normal"
            cursor="pointer"
          >
            {t('contractor.employees.actions.manage')}
          </Link>
        </Flex>
      </SearchGridItem>
    </Box>
  );
}
