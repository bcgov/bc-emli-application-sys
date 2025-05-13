import { Box, Container, Flex, Heading, Text, VStack } from '@chakra-ui/react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSearch } from '../../../hooks/use-search';
import { useMst } from '../../../setup/root';
import { EProgramSortFields } from '../../../types/enums';
import { Paginator } from '../../shared/base/inputs/paginator';
import { PerPageSelect } from '../../shared/base/inputs/per-page-select';
import { SharedSpinner } from '../../shared/base/shared-spinner';
import { SearchGrid } from '../../shared/grid/search-grid';
import { SearchGridItem } from '../../shared/grid/search-grid-item';
import { RouterLink } from '../../shared/navigation/router-link';
import { RouterLinkButton } from '../../shared/navigation/router-link-button';
import { GridHeaders } from './grid-header';
import { ManageProgramMenu } from '../../shared/program/manage-program-menu';

export const ProgramsIndexScreen = observer(function ProgramsIndex() {
  const { programStore } = useMst();
  const {
    tablePrograms,
    currentPage,
    totalPages,
    totalCount,
    countPerPage,
    handleCountPerPageChange,
    handlePageChange,
    isSearching,
  } = programStore;
  const { t } = useTranslation();

  useSearch(programStore);

  return (
    <Container maxW="container.lg" p={8} as={'main'} flexGrow={1}>
      <VStack alignItems={'flex-start'} spacing={5} w={'full'} h={'full'}>
        <Flex justifyContent={'space-between'} w={'full'} alignItems={'flex-end'}>
          <Box>
            <Heading as="h1" color={'theme.blueAlt'}>
              {t('program.index.title')}
            </Heading>
            <Text color={'text.secondary'}>{t('program.index.description')}</Text>
          </Box>
          <RouterLinkButton variant={'primary'} to={'/programs/new-program'}>
            {t('program.index.createButton')}
          </RouterLinkButton>
        </Flex>

        <SearchGrid templateColumns="3fr repeat(4, 1fr)">
          <GridHeaders
            span={5}
            includeActionColumn
            columns={Object.values(EProgramSortFields).filter((field) => field !== EProgramSortFields.regionalDistrict)}
          />

          {isSearching ? (
            <Flex py={50} gridColumn={'span 6'}>
              <SharedSpinner />
            </Flex>
          ) : tablePrograms.length === 0 ? (
            <Flex py={50} gridColumn={'span 6'} justifyContent="center">
              <Text color="gray.500"> {t('errors.noResults')}</Text>
            </Flex>
          ) : (
            tablePrograms.map((program) => {
              return (
                <Box key={program.id} className={'jurisdiction-index-grid-row'} role={'row'} display={'contents'}>
                  <SearchGridItem fontWeight={700}>{program.programName}</SearchGridItem>
                  <SearchGridItem>{program.adminManagersSize ?? 0}</SearchGridItem>
                  <SearchGridItem>{program.adminSize ?? 0}</SearchGridItem>
                  <SearchGridItem>{program.permitApplicationsSize ?? 0}</SearchGridItem>
                  {/* <SearchGridItem>{program.templatesUsed ?? 0}</SearchGridItem> */}
                  <SearchGridItem>
                    <Flex justify="center" w="full" gap={3}>
                      <RouterLink to={`${program?.id}/invite`}>{t('user.invite')}</RouterLink>
                      <ManageProgramMenu program={program} searchModel={programStore} />
                    </Flex>
                  </SearchGridItem>
                </Box>
              );
            })
          )}
        </SearchGrid>
        <Flex w={'full'} justifyContent={'space-between'}>
          <PerPageSelect
            handleCountPerPageChange={handleCountPerPageChange}
            countPerPage={countPerPage}
            totalCount={totalCount}
          />
          <Paginator
            current={currentPage}
            total={totalCount}
            totalPages={totalPages}
            pageSize={countPerPage}
            handlePageChange={handlePageChange}
            showLessItems={true}
          />
        </Flex>
      </VStack>
    </Container>
  );
});
