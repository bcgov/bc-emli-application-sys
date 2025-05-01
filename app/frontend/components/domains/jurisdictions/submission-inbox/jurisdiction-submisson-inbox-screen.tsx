import { Box, Button, Container, Flex, Heading, HStack, IconButton, Stack, Text, VStack } from '@chakra-ui/react';
import { ArrowSquareOut, Download } from '@phosphor-icons/react';
import { format } from 'date-fns';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useJurisdiction } from '../../../../hooks/resources/use-jurisdiction';
import { usePermitClassificationsLoad } from '../../../../hooks/resources/use-permit-classifications-load';
import { useSearch } from '../../../../hooks/use-search';
import { IEnergySavingsApplication } from '../../../../models/energy-savings-application';
import { useMst } from '../../../../setup/root';
import { ECollaborationType, EPermitClassificationCode } from '../../../../types/enums';
import { ErrorScreen } from '../../../shared/base/error-screen';
import { Paginator } from '../../../shared/base/inputs/paginator';
import { PerPageSelect } from '../../../shared/base/inputs/per-page-select';
import { LoadingScreen } from '../../../shared/base/loading-screen';
import { SharedSpinner } from '../../../shared/base/shared-spinner';
import { SearchGrid } from '../../../shared/grid/search-grid';
import { SearchGridItem } from '../../../shared/grid/search-grid-item';
import { RouterLink } from '../../../shared/navigation/router-link';
import { RouterLinkButton } from '../../../shared/navigation/router-link-button';
import { EnergySavingsApplicationStatusTag } from '../../../shared/energy-savings-applications/energy-savings-application-status-tag';
import { PermitApplicationViewedAtTag } from '../../../shared/energy-savings-applications/permit-application-viewed-at-tag';
import { Can } from '../../../shared/user/can';
import { DesignatedCollaboratorAssignmentPopover } from '../../energy-savings-application/collaborator-management/designated-collaborator-assignment-popover';
import { SubmissionDownloadModal } from '../../energy-savings-application/submission-download-modal';
import { GridHeaders } from './grid-header';
import { AsyncDropdown } from '../../../shared/base/inputs/async-dropdown';
import { FormProvider, useForm, Controller } from 'react-hook-form';
import { useProgram } from '../../../../hooks/resources/use-program';
import { IOption } from '../../../../types/types';
import { c } from 'vite/dist/node/types.d-aGj9QkWt';

export const JurisdictionSubmissionInboxScreen = observer(function JurisdictionSubmissionInbox() {
  const { t } = useTranslation();
  const methods = useForm({
    defaultValues: {
      selectedType: null,
    },
  });
  const [options, setOptions] = useState<IOption<FetchOptionI>[]>([]);
  const { permitApplicationStore, sandboxStore, permitClassificationStore } = useMst();
  const { setUserGroupFilter, setAudienceTypeFilter, setSubmissionTypeFilter, search } = permitApplicationStore;
  const { currentProgram, error } = useProgram();
  const { isLoaded: isPermitClassificationsLoaded } = usePermitClassificationsLoad();

  const { currentPage, totalPages, totalCount, countPerPage, handleCountPerPageChange, handlePageChange, isSearching } =
    permitApplicationStore;

  const {
    getUserTypeIdByCode,
    getSubmissionTypeIdByCode,
    getAudienceTypeIdByCode,
    getAllSubmissionTypeIds,
    getSubmissionTypeIdsExceptOnboarding,
  } = permitClassificationStore;

  type FetchOptionI = {
    userGroupType: string;
    AudienceType: string;
    SubmissionType: string[] | string;
  };

  const fetchOptionsTypes = useCallback(async (): Promise<IOption<FetchOptionI>[]> => {
    return [
      {
        label: t('energySavingsApplication.submissionInbox.participantSubmission'),
        value: {
          userGroupType: getUserTypeIdByCode(EPermitClassificationCode.participant),
          AudienceType: getAudienceTypeIdByCode(EPermitClassificationCode.internal),
          SubmissionType: getAllSubmissionTypeIds(),
        },
      },
      {
        label: t('energySavingsApplication.submissionInbox.contractorSubmission'),
        value: {
          userGroupType: getUserTypeIdByCode(EPermitClassificationCode.contractor),
          AudienceType: getAudienceTypeIdByCode(EPermitClassificationCode.internal),
          SubmissionType: getSubmissionTypeIdsExceptOnboarding(),
        },
      },
      {
        label: t('energySavingsApplication.submissionInbox.contractorOnboarding'),
        value: {
          userGroupType: getUserTypeIdByCode(EPermitClassificationCode.contractor),
          AudienceType: getAudienceTypeIdByCode(EPermitClassificationCode.internal),
          SubmissionType: getSubmissionTypeIdByCode(EPermitClassificationCode.onboarding),
        },
      },
    ];
  }, [getUserTypeIdByCode, getAudienceTypeIdByCode, getAllSubmissionTypeIds, getSubmissionTypeIdsExceptOnboarding]);

  const handleChange = (selectedOption) => {
    setUserGroupFilter(selectedOption?.userGroupType);
    setAudienceTypeFilter(selectedOption?.AudienceType);
    setSubmissionTypeFilter(selectedOption?.SubmissionType);
    search();
  };

  useEffect(() => {
    if (methods.getValues('selectedType')) {
      handleChange(methods.getValues('selectedType'));
    }
  }, [methods.watch('selectedType')]);

  useEffect(() => {
    if (options.length > 0) {
      methods.setValue('selectedType', options[0].value);
    }
  }, [options, methods]);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      if (!permitClassificationStore.isLoaded) {
        const success = await permitClassificationStore.fetchPermitClassifications();
        if (!success) return;
      }
      const result = await fetchOptionsTypes();
      if (isMounted) {
        setOptions(result);
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, [permitClassificationStore]);

  if (error) return <ErrorScreen error={error} />;
  if (!currentProgram || !isPermitClassificationsLoaded) return <LoadingScreen />;

  return (
    <Container maxW="container.xl" as={'main'}>
      <VStack align={'start'} spacing={5} w={'full'} h={'full'} py={8} px={16}>
        <Flex justify={'space-between'} w={'full'}>
          <Box>
            <Heading as="h1" color="theme.blueAlt">
              {t('permitApplication.submissionInbox.title')}
            </Heading>
            <Text fontSize="sm" color="text.secondary">
              {t('permitApplication.submissionInbox.tableDescription')}
            </Text>
            <FormProvider {...methods}>
              <form>
                <Controller
                  name="selectedType"
                  control={methods.control}
                  render={({ field }) => (
                    <AsyncDropdown
                      mt={4}
                      fetchOptions={async () => options}
                      fieldName="selectedType"
                      useBoxWrapper={false}
                      value={field.value}
                      onValueChange={(value) => {
                        handleChange(value);
                        field.onChange(value);
                      }}
                      {...field}
                    />
                  )}
                />
              </form>
            </FormProvider>

            <Heading as="h2" color="theme.blueAlt" mt={4}>
              {t('permitApplication.submissionInbox.tableSubHeading')}
            </Heading>
          </Box>
          <Can action="jurisdiction:manage" data={{ jurisdiction: currentProgram }}>
            <Button
              as={RouterLink}
              to={`/jurisdictions/${currentProgram.slug}/configuration-management/submissions-inbox-setup`}
              variant="secondary"
            >
              {t('ui.setup')}
            </Button>
          </Can>
        </Flex>

        <SearchGrid templateColumns="repeat(7, 1fr)">
          <GridHeaders />

          {isSearching ? (
            <Flex py={50} gridColumn={'span 7'}>
              <SharedSpinner />
            </Flex>
          ) : (
            currentProgram.tablePermitApplications.map((pa: IEnergySavingsApplication) => {
              if (!pa.submitter) return <></>;

              return (
                <Box
                  key={pa.id}
                  className={'jurisdiction-permit-application-index-grid-row'}
                  role={'row'}
                  display={'contents'}
                >
                  <SearchGridItem>
                    <EnergySavingsApplicationStatusTag energySavingsApplication={pa} />
                  </SearchGridItem>
                  <SearchGridItem>{pa.number}</SearchGridItem>
                  <SearchGridItem wordBreak={'break-word'}>{pa.referenceNumber}</SearchGridItem>
                  <SearchGridItem>
                    <Flex>
                      <Text fontWeight={700} flex={1}>
                        {pa.submitter.name}
                      </Text>
                    </Flex>
                  </SearchGridItem>
                  <SearchGridItem>
                    <Flex direction="column">
                      <Text>{format(pa?.createdAt, 'yyyy-MM-dd')}</Text>
                      <Text>{format(pa?.createdAt, 'HH:mm')}</Text>
                    </Flex>
                  </SearchGridItem>
                  <SearchGridItem>
                    <Flex>
                      <Text fontWeight={700} flex={1}>
                        {pa.submitter.name}
                      </Text>
                      <Box flex={1}>
                        <DesignatedCollaboratorAssignmentPopover
                          permitApplication={pa}
                          collaborationType={ECollaborationType.review}
                          avatarTrigger
                        />
                      </Box>
                    </Flex>
                  </SearchGridItem>
                  <SearchGridItem gap={2}>
                    <Stack>
                      <HStack>
                        <SubmissionDownloadModal
                          permitApplication={pa}
                          renderTrigger={(onOpen) => (
                            <IconButton
                              variant="secondary"
                              icon={<Download />}
                              aria-label={'download'}
                              onClick={onOpen}
                            />
                          )}
                          review
                        />
                        <RouterLinkButton variant="primary" to={`/permit-applications/${pa.id}`}>
                          {t('ui.view')}
                        </RouterLinkButton>
                      </HStack>
                    </Stack>
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