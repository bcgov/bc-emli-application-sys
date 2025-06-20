import { Box, Button, Container, Flex, FormControl, FormLabel } from '@chakra-ui/react';
import { CaretDown, Funnel } from '@phosphor-icons/react';
import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFlashQueryParam } from '../../../hooks/use-flash-query-param';
import { useQuery } from '../../../hooks/use-query';
import { useResetQueryParams } from '../../../hooks/use-reset-query-params';
import { useSearch } from '../../../hooks/use-search';
import { IEnergySavingsApplication } from '../../../models/energy-savings-application';
import { useMst } from '../../../setup/root';
import {
  EPermitApplicationStatusGroup,
  EPermitApplicationSubmitterSortFields,
  EPermitClassificationCode,
  EUserRoles,
} from '../../../types/enums';
import { BlueTitleBar } from '../../shared/base/blue-title-bar';
import { Paginator } from '../../shared/base/inputs/paginator';
import { PerPageSelect } from '../../shared/base/inputs/per-page-select';
import { ModelSearchInput } from '../../shared/base/model-search-input';
import { SharedSpinner } from '../../shared/base/shared-spinner';
import { EnergySavingsApplicationCard } from '../../shared/energy-savings-applications/energy-savings-application-card';
import { RouterLinkButton } from '../../shared/navigation/router-link-button';
import { SortSelect } from '../../shared/select/selectors/sort-select';
import { PermitApplicationStatusTabs } from '../../shared/energy-savings-applications/permit-application-status-tabs';
import { EnergySavingsApplicationFilter } from '../../shared/energy-savings-applications/energy-savings-application-filter';
import { useLocation } from 'react-router-dom';

interface IEnergySavingsApplicationIndexScreenProps {}

export const EnergySavingsApplicationIndexScreen = observer(({}: IEnergySavingsApplicationIndexScreenProps) => {
  const { t } = useTranslation();
  const { permitApplicationStore, sandboxStore, userStore } = useMst();
  const {
    tablePermitApplications,
    currentPage,
    totalPages,
    totalCount,
    countPerPage,
    handleCountPerPageChange,
    handlePageChange,
    isSearching,
    statusFilterToGroup,
    hasResetableFilters,
  } = permitApplicationStore;

  const { currentSandboxId } = sandboxStore;
  const location = useLocation();
  const query = useQuery();
  const currentUser = userStore.currentUser;

  const { setUserGroupFilter, setAudienceTypeFilter, setSubmissionTypeFilter, search } = permitApplicationStore;
  const requirementTemplateId = query.get('requirementTemplateId');
  const templateVersionId = query.get('templateVersionId');
  const filters = t('energySavingsApplication.filter', { returnObjects: true }) as { [key: string]: string };

  setUserGroupFilter(EPermitClassificationCode.participant);
  setAudienceTypeFilter(
    currentUser.isParticipant ? EPermitClassificationCode.external : EPermitClassificationCode.internal,
  );
  setSubmissionTypeFilter(
    currentUser.isParticipant
      ? EPermitClassificationCode.application
      : [
          EPermitClassificationCode.application,
          EPermitClassificationCode.onboarding,
          EPermitClassificationCode.invoice,
          EPermitClassificationCode.supportRequest,
        ],
  );

  useSearch(permitApplicationStore, [
    requirementTemplateId || '',
    templateVersionId || '',
    JSON.stringify(currentSandboxId),
  ]);
  useFlashQueryParam();
  const resetQueryParams = useResetQueryParams();

  return (
    <Flex as="main" direction="column" w="full" bg="greys.white" pb="24">
      {/* <PermitApplicationStatusTabs /> */}
      <BlueTitleBar
        title={
          location.pathname.endsWith('/supported-applications')
            ? t('site.breadcrumb.supportedApplications')
            : t('site.myApplications')
        }
      />
      <Container maxW="container.lg" pb={4}>
        <Flex as="section" direction="column" p={6} gap={6} flex={1}>
          <Flex
            gap={6}
            align={{ base: 'flex-start', md: 'flex-end' }}
            justify="space-between"
            direction={{ base: 'column', md: 'row' }}
          >
            <RouterLinkButton to="/new-application" variant="primary" w={{ base: 'full', md: 'fit-content' }}>
              {t('energySavingsApplication.start')}
            </RouterLinkButton>
            <Flex
              align={{ md: 'end' }}
              gap={4}
              direction={{ base: 'column', md: 'row' }}
              w={{ base: 'full', md: 'fit-content' }}
            >
              <Flex direction={{ base: 'row' }} alignItems={{ md: 'end', base: 'end' }} gap={4}>
                <EnergySavingsApplicationFilter
                  statusGroups={[
                    EPermitApplicationStatusGroup.draft,
                    EPermitApplicationStatusGroup.submitted,
                    EPermitApplicationStatusGroup.revisionsRequested,
                    EPermitApplicationStatusGroup.approved,
                    EPermitApplicationStatusGroup.ineligible,
                    EPermitApplicationStatusGroup.resubmitted,
                  ]}
                />
                {hasResetableFilters && (
                  <Button variant="link" mb={2} onClick={resetQueryParams}>
                    {t('ui.resetFilters')}
                  </Button>
                )}
                <FormControl flex={1}>
                  <FormLabel>{t('ui.search')}</FormLabel>
                  <Box minW={{ md: 250, base: '100%' }}>
                    <ModelSearchInput
                      searchModel={permitApplicationStore}
                      inputGroupProps={{ w: { md: '100%', base: 'full' } }}
                    />
                  </Box>
                </FormControl>
              </Flex>
              <SortSelect
                searchModel={permitApplicationStore}
                i18nPrefix="permitApplication"
                sortFields={Object.values(EPermitApplicationSubmitterSortFields)}
              />
            </Flex>
          </Flex>

          {isSearching ? (
            <Flex py="50" w="full">
              <SharedSpinner h={50} w={50} />
            </Flex>
          ) : tablePermitApplications.length === 0 ? (
            <Flex py="50" w="full" justify="center">
              {t('errors.noResults')}
            </Flex>
          ) : (
            tablePermitApplications.map((pa) => (
              <EnergySavingsApplicationCard key={pa.id} energySavingsApplication={pa as IEnergySavingsApplication} />
            ))
          )}
        </Flex>
        <Flex px={6} justify="space-between">
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
      </Container>
    </Flex>
  );
});
