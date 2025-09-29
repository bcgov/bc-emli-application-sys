import { Box, Flex, GridItem, Text } from '@chakra-ui/react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useMst } from '../../../../setup/root';
import { ModelSearchInput } from '../../../shared/base/model-search-input';
import { GridHeader } from '../../../shared/grid/grid-header';
import { SortIcon } from '../../../shared/sort-icon';

export const SimpleEmployeeGridHeaders = observer(function SimpleEmployeeGridHeaders() {
  const { userStore } = useMst();
  const { toggleSort } = userStore;
  const { t } = useTranslation();

  return (
    <Box display={'contents'} role={'rowgroup'}>
      <Box display={'contents'} role={'row'}>
        <GridItem as={Flex} gridColumn={'span 4'} p={6} bg={'greys.grey10'} justifyContent={'flex-end'} align="center">
          <ModelSearchInput searchModel={userStore} />
        </GridItem>
      </Box>
      <Box display={'contents'} role={'row'}>
        <GridHeader role={'columnheader'} id="employee-name-header">
          <Flex
            w={'full'}
            as={'button'}
            justifyContent={'space-between'}
            cursor="pointer"
            onClick={() => toggleSort('first_name')}
            borderRight={'1px solid'}
            borderColor={'border.light'}
            px={4}
          >
            <Text textAlign="left">{t('contractor.employees.fields.name')}</Text>
            <SortIcon field="first_name" currentSort={userStore.sort} />
          </Flex>
        </GridHeader>
        <GridHeader role={'columnheader'} id="employee-email-header">
          <Flex
            w={'full'}
            as={'button'}
            justifyContent={'space-between'}
            cursor="pointer"
            onClick={() => toggleSort('email')}
            borderRight={'1px solid'}
            borderColor={'border.light'}
            px={4}
          >
            <Text textAlign="left">{t('contractor.employees.fields.email')}</Text>
            <SortIcon field="email" currentSort={userStore.sort} />
          </Flex>
        </GridHeader>
        <GridHeader role={'columnheader'} id="employee-updated-header">
          <Flex
            w={'full'}
            as={'button'}
            justifyContent={'space-between'}
            cursor="pointer"
            onClick={() => toggleSort('updated_at')}
            borderRight={'1px solid'}
            borderColor={'border.light'}
            px={4}
          >
            <Text textAlign="left">{t('contractor.employees.fields.lastUpdated')}</Text>
            <SortIcon field="updated_at" currentSort={userStore.sort} />
          </Flex>
        </GridHeader>
        <GridHeader role={'columnheader'} id="employee-action-header">
          <Text px={4} textAlign="left">
            {t('contractor.employees.fields.action')}
          </Text>
        </GridHeader>
      </Box>
    </Box>
  );
});
