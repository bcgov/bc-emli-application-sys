import { Box, Flex, GridItem, Text } from '@chakra-ui/react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useMst } from '../../../../setup/root';
import { EActiveUserSortFields, EPendingUserSortFields, EDeactivatedUserSortFields } from '../../../../types/enums';
import { ModelSearchInput } from '../../../shared/base/model-search-input';
import { GridHeader } from '../../../shared/grid/grid-header';
import { SortIcon } from '../../../shared/sort-icon';

export const ActiveGridHeaders = observer(function GridHeaders() {
  const { userStore } = useMst();
  const { toggleSort, sort, getActiveUserSortColumnHeader } = userStore;
  const { t } = useTranslation();

  return (
    <Box display={'contents'} role={'rowgroup'}>
      <Box display={'contents'} role={'row'}>
        <GridItem
          as={Flex}
          gridColumn={'span 7'}
          p={6}
          bg={'greys.grey10'}
          justifyContent={'space-between'}
          align="center"
        >
          <Text role={'heading'}>{t('user.index.tableHeading')}</Text>
          <ModelSearchInput searchModel={userStore} />
        </GridItem>
      </Box>
      <Box display={'contents'} role={'row'}>
        {Object.values(EActiveUserSortFields).map((field) => (
          <GridHeader key={field} role={'columnheader'}>
            <Flex
              w={'full'}
              as={'button'}
              justifyContent={'space-between'}
              cursor="pointer"
              onClick={() => toggleSort(field)}
              borderRight={'1px solid'}
              borderColor={'border.light'}
              px={4}
            >
              <Text textAlign="left">{getActiveUserSortColumnHeader(field)}</Text>
              <SortIcon<EActiveUserSortFields> field={field} currentSort={sort} />
            </Flex>
          </GridHeader>
        ))}
        <GridHeader role={'columnheader'}>
          <Text px={4} textAlign="left">
            {t(`user.fields.action`)}
          </Text>
        </GridHeader>
      </Box>
    </Box>
  );
});

export const PendingGridHeaders = observer(function GridHeaders() {
  const { userStore } = useMst();
  const { toggleSort, sort, getPendingUserSortColumnHeader } = userStore;
  const { t } = useTranslation();

  return (
    <Box display={'contents'} role={'rowgroup'}>
      <Box display={'contents'} role={'row'}>
        <GridItem
          as={Flex}
          gridColumn={'span 7'}
          p={6}
          bg={'greys.grey10'}
          justifyContent={'space-between'}
          align="center"
        >
          <Text role={'heading'}>{t('user.index.tableHeading')}</Text>
          <ModelSearchInput searchModel={userStore} />
        </GridItem>
      </Box>
      <Box display={'contents'} role={'row'}>
        {Object.values(EPendingUserSortFields).map((field) => (
          <GridHeader key={field} role={'columnheader'}>
            <Flex
              w={'full'}
              as={'button'}
              justifyContent={'space-between'}
              cursor="pointer"
              onClick={() => toggleSort(field)}
              borderRight={'1px solid'}
              borderColor={'border.light'}
              px={4}
            >
              <Text textAlign="left">{getPendingUserSortColumnHeader(field)}</Text>
              <SortIcon<EPendingUserSortFields> field={field} currentSort={sort} />
            </Flex>
          </GridHeader>
        ))}
        <GridHeader role={'columnheader'}>
          <Text px={4} textAlign="left">
            {t(`user.fields.action`)}
          </Text>
        </GridHeader>
      </Box>
    </Box>
  );
});

export const DeactivatedGridHeaders = observer(function GridHeaders() {
  const { userStore } = useMst();
  const { toggleSort, sort, getDeactivatedUserSortColumnHeader } = userStore;
  const { t } = useTranslation();

  return (
    <Box display={'contents'} role={'rowgroup'}>
      <Box display={'contents'} role={'row'}>
        <GridItem
          as={Flex}
          gridColumn={'span 7'}
          p={6}
          bg={'greys.grey10'}
          justifyContent={'space-between'}
          align="center"
        >
          <Text role={'heading'}>{t('user.index.tableHeading')}</Text>
          <ModelSearchInput searchModel={userStore} />
        </GridItem>
      </Box>
      <Box display={'contents'} role={'row'}>
        {Object.values(EDeactivatedUserSortFields).map((field) => (
          <GridHeader key={field} role={'columnheader'}>
            <Flex
              w={'full'}
              as={'button'}
              justifyContent={'space-between'}
              cursor="pointer"
              onClick={() => toggleSort(field)}
              borderRight={'1px solid'}
              borderColor={'border.light'}
              px={4}
            >
              <Text textAlign="left">{getDeactivatedUserSortColumnHeader(field)}</Text>
              <SortIcon<EDeactivatedUserSortFields> field={field} currentSort={sort} />
            </Flex>
          </GridHeader>
        ))}
        <GridHeader role={'columnheader'}>
          <Text px={4} textAlign="left">
            {t(`user.fields.action`)}
          </Text>
        </GridHeader>
      </Box>
    </Box>
  );
});
