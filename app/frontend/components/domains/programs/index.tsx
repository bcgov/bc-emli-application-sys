import { Box, Container, Flex, Heading, Text, VStack } from '@chakra-ui/react';
import { CheckCircle } from '@phosphor-icons/react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSearch } from '../../../hooks/use-search';
import { useMst } from '../../../setup/root';
import { EJurisdictionSortFields } from '../../../types/enums';
import { Paginator } from '../../shared/base/inputs/paginator';
import { PerPageSelect } from '../../shared/base/inputs/per-page-select';
import { SharedSpinner } from '../../shared/base/shared-spinner';
import { SearchGrid } from '../../shared/grid/search-grid';
import { SearchGridItem } from '../../shared/grid/search-grid-item';
import { ManageJurisdictionMenu } from '../../shared/jurisdiction/manage-jurisdiction-menu';
import { RouterLink } from '../../shared/navigation/router-link';
import { RouterLinkButton } from '../../shared/navigation/router-link-button';
import { GridHeaders } from './grid-header';

export const ProgramsIndexScreen = observer(function JurisdictionIndex() {
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
          <RouterLinkButton variant={'primary'} to={'/programs/new'}>
            {t('program.index.createButton')}
          </RouterLinkButton>
        </Flex>

        <SearchGrid templateColumns="3fr repeat(5, 1fr)">
          <GridHeaders
            span={6}
            includeActionColumn
            columns={Object.values(EJurisdictionSortFields).filter(
              (field) => field !== EJurisdictionSortFields.regionalDistrict,
            )}
          />

          {isSearching ? (
            <Flex py={50} gridColumn={'span 6'}>
              <SharedSpinner />
            </Flex>
          ) : (
            tablePrograms.map((j) => {
              return (
                <Box key={j.id} className={'jurisdiction-index-grid-row'} role={'row'} display={'contents'}>
                  <SearchGridItem fontWeight={700}>{j.programName}</SearchGridItem>
                  <SearchGridItem>{j.reviewManagersSize ?? 0}</SearchGridItem>
                  <SearchGridItem>{j.reviewersSize ?? 0}</SearchGridItem>
                  <SearchGridItem>{j.permitApplicationsSize ?? 0}</SearchGridItem>
                  <SearchGridItem>
                    {/* {j.submissionInboxSetUp && (
                      <Flex gap={1}>
                        <CheckCircle color="var(--chakra-colors-semantic-success)" size={18} />
                        {t('ui.yes')}
                      </Flex>
                    )} */}
                    <></>
                  </SearchGridItem>
                  <SearchGridItem>
                    <Flex justify="center" w="full" gap={3}>
                      <RouterLink to={`${j.slug}/users/invite`}>{t('user.invite')}</RouterLink>
                      <ManageJurisdictionMenu jurisdiction={j} searchModel={programStore} />
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
