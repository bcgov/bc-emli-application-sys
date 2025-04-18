import { Box, Flex, GridItem, Text } from '@chakra-ui/react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useMst } from '../../../setup/root';
import { EJurisdictionSortFields, EProgramSortFields } from '../../../types/enums';
import { ModelSearchInput } from '../../shared/base/model-search-input';
import { GridHeader } from '../../shared/grid/grid-header';
import { SortIcon } from '../../shared/sort-icon';

interface IGridHeadersProps {
  columns: string[];
  span: number;
  includeActionColumn?: boolean;
}

export const GridHeaders = observer(function GridHeaders({ columns, span, includeActionColumn }: IGridHeadersProps) {
  const { programStore } = useMst();
  const { sort, toggleSort, getSortColumnHeader } = programStore;
  const { t } = useTranslation();

  return (
    <Box display={'contents'} role={'rowgroup'}>
      <Box display={'contents'} role={'row'}>
        <GridItem
          as={Flex}
          gridColumn={`span ${span}`}
          p={6}
          bg={'greys.grey10'}
          justifyContent={'space-between'}
          align="center"
        >
          <Text role={'heading'}>{t('program.index.tableHeading')}</Text>
          <ModelSearchInput searchModel={programStore} />
        </GridItem>
      </Box>
      <Box display={'contents'} role={'row'}>
        {columns.map((field) => {
          return (
            <GridHeader key={field} role={'columnheader'}>
              <Flex
                w={'full'}
                as={'button'}
                justifyContent={'space-between'}
                cursor="pointer"
                onClick={() => toggleSort(field as any as EProgramSortFields)}
                borderRight={'1px solid'}
                borderColor={'border.light'}
                px={4}
              >
                <Text textAlign="left">{getSortColumnHeader(field as any as EProgramSortFields)}</Text>
                <SortIcon<EProgramSortFields> field={field as any as EProgramSortFields} currentSort={sort} />
              </Flex>
            </GridHeader>
          );
        })}
        {includeActionColumn && <GridHeader role={'columnheader'} />}
      </Box>
    </Box>
  );
});
