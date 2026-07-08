import { Badge, Box, Container, Flex, Heading, HStack, IconButton, Stack, Text, VStack } from '@chakra-ui/react';
import { ChatCircle, Download } from '@phosphor-icons/react';
import { format } from 'date-fns';
import { observer } from 'mobx-react-lite';
import React, { useCallback, useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { usePermitClassificationsLoad } from '../../../../hooks/resources/use-permit-classifications-load';
import { useProgram } from '../../../../hooks/resources/use-program';
import { useSessionStorage } from '../../../../hooks/use-session-state';
import { IEnergySavingsApplication } from '../../../../models/energy-savings-application';
import { useMst } from '../../../../setup/root';
import { ECollaborationType, EFlashMessageStatus } from '../../../../types/enums';
import { IMinimalFrozenUser } from '../../../../types/types';
import { ErrorScreen } from '../../../shared/base/error-screen';
import { AsyncDropdown } from '../../../shared/base/inputs/async-dropdown';
import { Paginator } from '../../../shared/base/inputs/paginator';
import { PerPageSelect } from '../../../shared/base/inputs/per-page-select';
import { LoadingScreen } from '../../../shared/base/loading-screen';
import { SharedSpinner } from '../../../shared/base/shared-spinner';
import { EnergySavingsApplicationStatusTag } from '../../../shared/energy-savings-applications/energy-savings-application-status-tag';
import { SearchGrid } from '../../../shared/grid/search-grid';
import { SearchGridItem } from '../../../shared/grid/search-grid-item';
import { RouterLinkButton } from '../../../shared/navigation/router-link-button';
import { DesignatedCollaboratorAssignmentPopover } from '../../energy-savings-application/assignment-management/designated-user-assignment-popover';
import { InternalCommentsModal } from '../../energy-savings-application/internal-comments-modal';
import { SubmissionDownloadModal } from '../../energy-savings-application/submission-download-modal';
import { GridHeaders } from './grid-header';

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

  const { setUserGroupFilter, setAudienceTypeFilter, setSubmissionTypeFilter } = permitApplicationStore;

  const [programOptions, setProgramOptions] = useState([]);
  const [submissionOptions, setSubmissionOptions] = useState([]);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [fromPage, setFromPage] = useSessionStorage('fromPage', null);
  const { currentPage, totalPages, totalCount, countPerPage, handleCountPerPageChange, handlePageChange, isSearching } =
    permitApplicationStore;

  const { currentProgram, error } = useProgram();

  const handleChange = (selectedValue) => {
    if (!selectedValue) {
      return;
    }

    // Set classification filters. Status filter and search are owned by
    // EnergySavingsApplicationFilter, which re-mounts via filterKey when these change.
    setUserGroupFilter(selectedValue?.userGroupType);
    setAudienceTypeFilter(selectedValue?.AudienceType);
    setSubmissionTypeFilter(selectedValue?.SubmissionType);
  };

  const handleProgramChange = useCallback(
    async (programId) => {
      await programStore.fetchProgram(programId);
      programStore.setCurrentProgram(programId);
    },
    [programStore],
  );

  // Fetch submission options and program options separately
  const fetchSubmissionOptions = useCallback(async () => {
    try {
      const result = permitClassificationStore.submissionOptionTypes();

      // Translate the labels
      const translatedOptions = result.map((option) => {
        let translatedLabel = option.label;
        let translatedTitle = '';
        if (option.label === 'participantSubmission') {
          translatedLabel = t('energySavingsApplication.submissionInbox.participantSubmission');
          translatedTitle = t('energySavingsApplication.submissionInbox.titles.participant');
        } else if (option.label === 'contractorSubmission') {
          translatedLabel = t('energySavingsApplication.submissionInbox.contractorSubmission');
          translatedTitle = t('energySavingsApplication.submissionInbox.titles.contractor');
        } else if (option.label === 'contractorOnboarding') {
          translatedLabel = t('energySavingsApplication.submissionInbox.contractorOnboarding');
          translatedTitle = t('energySavingsApplication.submissionInbox.titles.contractorOnboarding');
        }
        const translatedOption = {
          ...option,
          value: { ...option.value, title: translatedTitle },
          label: translatedLabel,
        };
        return translatedOption;
      });
      setSubmissionOptions(translatedOptions);

      // Set default classification filters. Status filter and initial search are
      // owned by EnergySavingsApplicationFilter, which mounts via filterKey.
      if (translatedOptions.length > 0) {
        const defaultOption = fromPage?.info ?? translatedOptions[0].value;
        methods.setValue('selectedType', defaultOption);
        setUserGroupFilter(defaultOption?.userGroupType);
        setAudienceTypeFilter(defaultOption?.AudienceType);
        setSubmissionTypeFilter(defaultOption?.SubmissionType);
      }
    } catch (error) {
      console.error('Failed to fetch submission options', error);
    }
  }, [permitClassificationStore, t, setUserGroupFilter, setAudienceTypeFilter, setSubmissionTypeFilter, methods]);

  const loadProgramOptions = useCallback(async () => {
    try {
      setIsInitialLoading(true);
      // Clear the supported applications filter when loading submission inbox
      permitApplicationStore.setIsSupportedApplicationsPageFilter(null);
      await userStore.fetchActivePrograms();
      const activePrograms = userStore.currentUser?.activePrograms ?? [];
      if (activePrograms.length === 0) {
        uiStore.flashMessage.show(
          EFlashMessageStatus.error,
          t('energySavingsApplication.submissionInbox.noAccess'),
          '',
        );
        setIsInitialLoading(false);
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
      setIsInitialLoading(false);
    } catch (error) {
      console.error('Error in loadProgramOptions:', error);
      setIsInitialLoading(false);
    }
  }, [userStore, uiStore, programStore, methods, fetchSubmissionOptions, handleProgramChange, t]);

  // Set URL query in store before the filter component's mount effect fires
  // its initial search, so the search uses it.
  useEffect(() => {
    const queryParam = new URLSearchParams(location.search).get('query');
    if (queryParam) permitApplicationStore.setQuery(queryParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadProgramOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Set count per page to 10 for submission inbox
  useEffect(() => {
    permitApplicationStore.setCountPerPage(10);
  }, [permitApplicationStore]);

  if (errorMessage) return <ErrorScreen error={errorMessage} />;
  if (!permitClassificationStore.isLoaded || isInitialLoading) return <LoadingScreen />;

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
                      {fromPage?.info?.title ?? t('energySavingsApplication.submissionInbox.titles.participant')}
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
                        setFromPage({
                          name: '/submission-inbox',
                          info: value,
                        });

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
          <Text>{permitApplication.submittedAt ? format(permitApplication.submittedAt, 'yyyy-MM-dd') : ''}</Text>
          <Text>{permitApplication.submittedAt ? format(permitApplication.submittedAt, 'HH:mm') : ''}</Text>
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
            <InternalCommentsModal
              permitApplication={permitApplication}
              renderTrigger={(onOpen) => (
                <Box position="relative" display="inline-flex">
                  <IconButton
                    variant="secondary"
                    icon={<ChatCircle />}
                    aria-label={
                      permitApplication.internalCommentsCount > 0
                        ? `${t('energySavingsApplication.show.internalComments.title')} (${permitApplication.internalCommentsCount})`
                        : t('energySavingsApplication.show.internalComments.title')
                    }
                    onClick={onOpen}
                  />
                  {permitApplication.internalCommentsCount > 0 && (
                    <Badge
                      aria-hidden={true}
                      position="absolute"
                      top="-6px"
                      right="-6px"
                      colorScheme="theme.blue"
                      bg="theme.blue"
                      color="greys.white"
                      borderRadius="full"
                      fontSize="0.7em"
                      minW="18px"
                      textAlign="center"
                    >
                      {permitApplication.internalCommentsCount}
                    </Badge>
                  )}
                </Box>
              )}
            />
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
            {/* <RouterLinkButton variant="primary" to={`/applications_2/${permitApplication.id}`}>      
              view_new
            </RouterLinkButton> */}
          </HStack>
        </Stack>
      </SearchGridItem>
    </Box>
  );
};
