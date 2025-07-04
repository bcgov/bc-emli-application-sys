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
import { DesignatedCollaboratorAssignmentPopover } from '../../energy-savings-application/assignment-management/designated-user-assignment-popover';
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
      programId: null,
    },
  });
  const { programStore, permitApplicationStore, permitClassificationStore } = useMst();
  const { fetchProgramOptions } = programStore;
  const { setValue } = methods;

  const { setUserGroupFilter, setAudienceTypeFilter, setSubmissionTypeFilter, search } = permitApplicationStore;

  const [programOptions, setProgramOptions] = useState([]);
  const [errorMessage, setErrorMessage] = useState(null);

  const { isLoaded: isPermitClassificationsLoaded } = usePermitClassificationsLoad();
  const { currentPage, totalPages, totalCount, countPerPage, handleCountPerPageChange, handlePageChange, isSearching } =
    permitApplicationStore;

  const { currentProgram, error } = useProgram();

  type FetchOptionI = {
    userGroupType: string;
    AudienceType: string;
    SubmissionType: string[] | string;
  };

  const handleChange = (selectedOption) => {
    setUserGroupFilter(selectedOption?.userGroupType);
    setAudienceTypeFilter(selectedOption?.AudienceType);
    setSubmissionTypeFilter(selectedOption?.SubmissionType);
    search();
  };

  const loadProgramOptions = useCallback(async () => {
    try {
      const response = await fetchProgramOptions({});
      const options = response.map((option) => ({
        label: option.label,
        value: option.value.id,
      }));
      setProgramOptions(options);
      programStore.mergeUpdateAll(
        response.map((p) => p.value),
        'programMap',
      );
      if (options.length > 0) {
        const firstOption = options[0];
        methods.setValue('programId', firstOption.value);
        handleProgramChange(firstOption.value);
      }
    } catch (error) {
      console.error('Failed to fetch program options', error);
    }
  }, [fetchProgramOptions, programStore, methods, t]);

  const handleProgramChange = (programId) => {
    programStore.setCurrentProgram(programId);
    search();
  };

  useEffect(() => {
    loadProgramOptions();
  }, [loadProgramOptions]);

  if (errorMessage) return <ErrorScreen error={errorMessage} />;
  if (!permitClassificationStore.isLoaded) return <LoadingScreen />;

  return (
    <Container maxW="container.xl" as={'main'}>
      <VStack align={'start'} spacing={5} w={'full'} h={'full'} py={8} px={16}>
        <Flex justify={'space-between'} w={'full'}>
          <Box>
            <Heading as="h1" color="theme.blueAlt">
              {t('permitApplication.submissionInbox.title')}
            </Heading>
            <Text fontSize="sm" color="text.secondary">
              {t('permitApplication.submissionInbox.chooseProgram')}
            </Text>
            <FormProvider {...methods}>
              <form>
                <Controller
                  name="programId"
                  control={methods.control}
                  defaultValue={methods.getValues('programId')}
                  render={({ field }) => (
                    <AsyncDropdown
                      mt={4}
                      fetchOptions={() => Promise.resolve(programOptions)}
                      fieldName="programId"
                      placeholderOptionLabel={t('ui.chooseProgram')}
                      useBoxWrapper={false}
                      onValueChange={(value) => {
                        field.onChange(value);
                        handleProgramChange(value);
                      }}
                    />
                  )}
                />
                {/* Retained for future use: Contractor submission inbox. Refer to commit history prior to May 7th for changes */}
                {/* <Controller
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
                /> */}
              </form>
            </FormProvider>

            <Heading as="h2" color="theme.blueAlt" mt={8}>
              {t('permitApplication.submissionInbox.tableSubHeading')}
            </Heading>
          </Box>
        </Flex>

        <SearchGrid templateColumns="repeat(7, 1fr)">
          <GridHeaders />

          {isSearching ? (
            <Flex py={50} gridColumn={'span 7'}>
              <SharedSpinner />
            </Flex>
          ) : currentProgram?.tablePermitApplications.length === 0 ? (
            <Flex py={50} gridColumn="span 7" justify="center" align="center">
              <Text>{t('errors.noResults')}</Text>
            </Flex>
          ) : (
            currentProgram?.tablePermitApplications.map((pa: IEnergySavingsApplication) => (
              <ApplicationItem key={pa.id} permitApplication={pa} />
            ))
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
// New Component for Rendering Each Application Item
const ApplicationItem = ({ permitApplication }: { permitApplication: IEnergySavingsApplication }) => {
  const { t } = useTranslation();
  return (
    <Box
      key={permitApplication.id}
      className="jurisdiction-permit-application-index-grid-row"
      role="row"
      display="contents"
    >
      <SearchGridItem>
        <EnergySavingsApplicationStatusTag energySavingsApplication={permitApplication} />
      </SearchGridItem>
      <SearchGridItem>{permitApplication.number}</SearchGridItem>
      <SearchGridItem wordBreak="break-word">{permitApplication?.submissionType?.name}</SearchGridItem>
      <SearchGridItem>
        <Flex>
          <Text fontWeight={700} flex={1}>
            {permitApplication.submitter.name}
          </Text>
        </Flex>
      </SearchGridItem>
      <SearchGridItem>
        <Flex direction="column">
          <Text>{format(permitApplication.createdAt, 'yyyy-MM-dd')}</Text>
          <Text>{format(permitApplication.createdAt, 'HH:mm')}</Text>
        </Flex>
      </SearchGridItem>
      <SearchGridItem>
        <Flex>
          <Text fontWeight={700} flex={1}>
            {permitApplication.submitter.name}
          </Text>
          <Box flex={1}>
            <DesignatedCollaboratorAssignmentPopover
              permitApplication={permitApplication}
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
              permitApplication={permitApplication}
              renderTrigger={(onOpen) => (
                <IconButton variant="secondary" icon={<Download />} aria-label="download" onClick={onOpen} />
              )}
              review
            />
            <RouterLinkButton variant="primary" to={`/permit-applications/${permitApplication.id}`}>
              {t('ui.view')}
            </RouterLinkButton>
          </HStack>
        </Stack>
      </SearchGridItem>
    </Box>
  );
};
