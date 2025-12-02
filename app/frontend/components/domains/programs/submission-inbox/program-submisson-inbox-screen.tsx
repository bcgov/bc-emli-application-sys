import { Box, Button, Container, Flex, Heading, HStack, IconButton, Stack, Text, VStack } from '@chakra-ui/react';
import { ArrowSquareOut, Download } from '@phosphor-icons/react';
import { format } from 'date-fns';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useCallback, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useJurisdiction } from '../../../../hooks/resources/use-jurisdiction';
import { usePermitClassificationsLoad } from '../../../../hooks/resources/use-permit-classifications-load';
import { useSearch } from '../../../../hooks/use-search';
import { IEnergySavingsApplication } from '../../../../models/energy-savings-application';
import { useMst } from '../../../../setup/root';
import {
  ECollaborationType,
  EFlashMessageStatus,
  EPermitApplicationStatus,
  EPermitClassificationCode,
} from '../../../../types/enums';
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
import { DesignatedCollaboratorAssignmentPopover } from '../../energy-savings-application/assignment-management/designated-user-assignment-popover';
import { SubmissionDownloadModal } from '../../energy-savings-application/submission-download-modal';
import { GridHeaders } from './grid-header';
import { AsyncDropdown } from '../../../shared/base/inputs/async-dropdown';
import { FormProvider, useForm, Controller } from 'react-hook-form';
import { useProgram } from '../../../../hooks/resources/use-program';
import { IMinimalFrozenUser, IOption } from '../../../../types/types';

export const ProgramSubmissionInboxScreen = observer(function ProgramSubmissionInbox() {
  const { isLoaded: isPermitClassificationsLoaded } = usePermitClassificationsLoad();
  const { t } = useTranslation();
  const methods = useForm({
    defaultValues: {
      selectedType: null,
      programId: null,
    },
  });
  const { programStore, permitApplicationStore, permitClassificationStore, userStore, uiStore } = useMst();
  const { setValue } = methods;

  const { setUserGroupFilter, setAudienceTypeFilter, setSubmissionTypeFilter, setStatusFilter, search } =
    permitApplicationStore;

  const [programOptions, setProgramOptions] = useState([]);
  const [submissionOptions, setSubmissionOptions] = useState([]);
  const [errorMessage, setErrorMessage] = useState(null);

  const { currentPage, totalPages, totalCount, countPerPage, handleCountPerPageChange, handlePageChange, isSearching } =
    permitApplicationStore;

  const { currentProgram, error } = useProgram();

  const handleChange = (selectedValue) => {
    if (!selectedValue) {
      return;
    }

    // Set classification filters
    setUserGroupFilter(selectedValue?.userGroupType);
    setAudienceTypeFilter(selectedValue?.AudienceType);
    setSubmissionTypeFilter(selectedValue?.SubmissionType);

    // Also set the status filter from the dropdown option
    if (selectedValue?.status) {
      setStatusFilter(selectedValue.status);
    }

    // The EnergySavingsApplicationFilter component will update the status filter
    // and trigger a new search with the correct statuses for this submission type
  };

  const handleProgramChange = useCallback(async (programId) => {
    await programStore.fetchProgram(programId);
    programStore.setCurrentProgram(programId);
  }, [programStore]);

  // Fetch submission options and program options separately
  const fetchSubmissionOptions = useCallback(async () => {
    try {
      const result = permitClassificationStore.submissionOptionTypes();

      // Translate the labels
      const translatedOptions = result.map((option) => {
        let translatedLabel = option.label;
        if (option.label === 'participantSubmission') {
          translatedLabel = t('energySavingsApplication.submissionInbox.participantSubmission');
        } else if (option.label === 'contractorSubmission') {
          translatedLabel = t('energySavingsApplication.submissionInbox.contractorSubmission');
        } else if (option.label === 'contractorOnboarding') {
          translatedLabel = t('energySavingsApplication.submissionInbox.contractorOnboarding');
        }
        const translatedOption = {
          ...option,
          label: translatedLabel,
        };
        return translatedOption;
      });
      setSubmissionOptions(translatedOptions);

      // Set default to participant submissions (set filters but don't search yet)
      if (translatedOptions.length > 0) {
        const defaultOption = translatedOptions[0].value;
        methods.setValue('selectedType', defaultOption);
        setUserGroupFilter(defaultOption?.userGroupType);
        setAudienceTypeFilter(defaultOption?.AudienceType);
        setSubmissionTypeFilter(defaultOption?.SubmissionType);
        // Status filter will be set by EnergySavingsApplicationFilter component
      }
    } catch (error) {
      console.error('Failed to fetch submission options', error);
    }
  }, [permitClassificationStore, t, setUserGroupFilter, setAudienceTypeFilter, setSubmissionTypeFilter, methods]);

  const loadProgramOptions = useCallback(async () => {
    try {
      await userStore.fetchActivePrograms();
      const activePrograms = userStore.currentUser?.activePrograms ?? [];
      if (activePrograms.length === 0) {
        uiStore.flashMessage.show(
          EFlashMessageStatus.error,
          t('energySavingsApplication.submissionInbox.noAccess'),
          '',
        );
        return;
      }
      const options = activePrograms.map((data) => ({
        label: data.program.programName,
        value: data.program.id,
      }));
      setProgramOptions(options);

      // Set the program FIRST before setting submission options
      if (options?.length > 0) {
        const firstOption = options[0];
        methods.setValue('programId', firstOption.value);
        await handleProgramChange(firstOption.value);
      }

      // Then set submission options, which will trigger the search
      await fetchSubmissionOptions();
    } catch (error) {
      console.error('Error in loadProgramOptions:', error);
    }
  }, [userStore, uiStore, programStore, methods, fetchSubmissionOptions, handleProgramChange, t]);

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
              {t('energySavingsApplication.submissionInbox.title')}
            </Heading>

            <FormProvider {...methods}>
              {programOptions.length > 0 && (
                <form>
                  <AsyncDropdown
                    mt={4}
                    fetchOptions={() => Promise.resolve(programOptions)}
                    fieldName="programId"
                    placeholderOptionLabel={t('ui.chooseProgram')}
                    useBoxWrapper={false}
                    onValueChange={(value) => {
                      handleProgramChange(value);
                    }}
                  />
                       <Box w={'full'}>
          <Heading as="h2" color="theme.blueAlt" mt={8}>
            Participant Submissions
          </Heading>
          <Text mt={2} color="greys.grey70">
            {t('energySavingsApplication.submissionInbox.chooseSubmissionInbox')}
          </Text>
        </Box>
                  {submissionOptions.length > 0 && (
                    <AsyncDropdown
                      mt={4}
                      fetchOptions={async () => submissionOptions}
                      fieldName="selectedType"
                      useBoxWrapper={false}
                      onValueChange={(value) => {
                        handleChange(value);
                      }}
                    />
                  )}
                </form>
              )}
            </FormProvider>
          </Box>
        </Flex>

   

        <SearchGrid templateColumns="1.5fr repeat(6, 1fr)" mt={4}>
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
  const [newUser, setNewUser] = useState<IMinimalFrozenUser | null>(null);

  return (
    <Box
      key={permitApplication.id}
      className="jurisdiction-permit-application-index-grid-row"
      role="row"
      display="contents"
    >
      <SearchGridItem>
        <EnergySavingsApplicationStatusTag energySavingsApplication={permitApplication} type="submission-inbox" />
      </SearchGridItem>
      <SearchGridItem>{permitApplication.number}</SearchGridItem>
      <SearchGridItem wordBreak="break-word">{permitApplication?.submissionType?.name}</SearchGridItem>
      <SearchGridItem>
        <Flex>
          <Text fontWeight={700} flex={1}>
            {permitApplication.submittedFor ? permitApplication.submittedFor : permitApplication.submitter?.name}
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
            {newUser
              ? `${newUser?.firstName || ''} ${newUser?.lastName || ''}`.trim()
              : `${permitApplication?.assignedUsers?.[0]?.firstName || ''} ${permitApplication?.assignedUsers?.[0]?.lastName || ''}`.trim()}
          </Text>
          <Box flex={1}>
            <DesignatedCollaboratorAssignmentPopover
              permitApplication={permitApplication}
              collaborationType={ECollaborationType.review}
              avatarTrigger
              onAssignComplete={(response) => {
                // Assuming response?.user contains the assigned user object
                const assignedUser = response?.user;

                if (assignedUser) {
                  // Set the user in both the MobX store and the local state
                  setNewUser(assignedUser);
                  permitApplication.setAssignedUsers([assignedUser]);
                }
              }}
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
            <RouterLinkButton variant="primary" to={`/applications/${permitApplication.id}`}>
              {t('ui.view')}
            </RouterLinkButton>
          </HStack>
        </Stack>
      </SearchGridItem>
    </Box>
  );
};
