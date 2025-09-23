import { Box, Flex, GridItem, Text } from '@chakra-ui/react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useMst } from '../../../setup/root';
import { EContractorSortFields } from '../../../stores/contractor-store';
import { GridHeader } from '../../shared/grid/grid-header';
import { SortIcon } from '../../shared/sort-icon';
import { ModelSearchInput } from '../../shared/base/model-search-input';

export const ContractorGridHeaders = observer(() => {
  const { t } = useTranslation();
  const { contractorStore } = useMst();
  const { toggleSort, sort, getSortColumnHeader } = contractorStore;

  return (
    <Box display={'contents'} role={'rowgroup'}>
      <Box display="contents" role="row">
        <GridItem as={Flex} gridColumn="span 7" p={6} bg="greys.grey10" alignItems="center">
          <Flex justifyContent="space-between" w="100%" alignItems="center">
            <Text role={'heading'} fontSize="lg">
              {t('contractor.management.tableHeading')}
            </Text>
            <Flex gap={3} maxW="500px" w="fit-content">
              <Box minW="300px" w="300px">
                <ModelSearchInput
                  searchModel={contractorStore}
                  inputGroupProps={{
                    bg: 'white',
                    w: '100%',
                  }}
                  inputProps={{
                    placeholder: t('contractor.management.searchPlaceholder'),
                    borderColor: 'greys.lightGrey',
                    _placeholder: { color: 'greys.grey' },
                    size: 'md',
                  }}
                />
              </Box>
            </Flex>
          </Flex>
        </GridItem>
      </Box>
      <Box display={'contents'} role={'row'}>
        {Object.keys(EContractorSortFields).map((key) => {
          const field = EContractorSortFields[key as keyof typeof EContractorSortFields];

          return (
            <GridHeader key={key} role={'columnheader'}>
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
                <Text textAlign="left">{getSortColumnHeader(field)}</Text>
                <SortIcon<EContractorSortFields> field={field} currentSort={sort} />
              </Flex>
            </GridHeader>
          );
        })}
        <GridHeader role={'columnheader'}>
          <Flex w={'full'} justifyContent={'center'} px={4}>
            <Text textAlign="center">{t('shared.actions', 'Actions')}</Text>
          </Flex>
        </GridHeader>
      </Box>
    </Box>
  );
});
