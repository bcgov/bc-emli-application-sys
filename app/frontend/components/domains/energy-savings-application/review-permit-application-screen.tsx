import { Box, Button, Divider, Flex, HStack, Heading, Spacer, Stack, Text, useDisclosure } from '@chakra-ui/react';
import { CaretDown, CaretRight, CaretUp, CheckCircle, NotePencil, Prohibit, Warning } from '@phosphor-icons/react';
import { observer } from 'mobx-react-lite';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation, Trans } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { usePermitApplication } from '../../../hooks/resources/use-permit-application';
import { useMst } from '../../../setup/root';
import { ECollaborationType, EPermitApplicationStatus } from '../../../types/enums';
import { CopyableValue } from '../../shared/base/copyable-value';
import { ErrorScreen } from '../../shared/base/error-screen';
import { LoadingScreen } from '../../shared/base/loading-screen';
import { RequirementForm } from '../../shared/energy-savings-applications/requirement-form';
import SandboxHeader from '../../shared/sandbox/sandbox-header';
import { ChecklistSideBar } from './checklist-sidebar';
import { BlockCollaboratorAssignmentManagement } from './assignment-management/block-collaborator-assignment-management';
import { useCollaborationAssignmentNodes } from './assignment-management/hooks/use-collaboration-assignment-nodes';
import { ContactSummaryModal } from './contact-summary-modal';
import { RevisionSideBar } from './revision-sidebar';
import { SubmissionDownloadModal } from './submission-download-modal';
import ApplicationReviewModal from '../../shared/modals/application-review-modal';
import UpdatePathwayModal from '../../shared/modals/application-update-pathway';
import { EnergySavingsApplicationStatusTag } from '../../shared/energy-savings-applications/energy-savings-application-status-tag';
import { SupportingFilesRequestModal } from './supporting-files-request-modal';
interface IReferenceNumberForm {
  referenceNumber?: string;
}

export const ReviewPermitApplicationScreen = observer(() => {
  const { userStore } = useMst();
  const currentUser = userStore.currentUser;
  const { currentPermitApplication, error } = usePermitApplication({ review: true });
  const { t } = useTranslation();
  const formRef = useRef(null);

  const { requirementBlockAssignmentNodes, updateRequirementBlockAssignmentNode } = useCollaborationAssignmentNodes({
    formRef,
  });
  const navigate = useNavigate();
  const { reset } = useForm<IReferenceNumberForm>({
    defaultValues: {
      referenceNumber: currentPermitApplication?.referenceNumber || '',
    },
  });

  const [completedBlocks, setCompletedBlocks] = useState({});
  const [performedBy, setPerformedBy] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isScreenIn, onOpen: onScreenIn, onClose: onScreenInclose } = useDisclosure();
  const { isOpen: isContactsOpen, onOpen: onContactsOpen, onClose: onContactsClose } = useDisclosure();
  const { isOpen: isUpdatePathwayOpen, onOpen: onUpdatePathwayOpen, onClose: onUpdatePathwayClose } = useDisclosure();
  const {
    isOpen: isRequestSupportingFilesOpen,
    onOpen: onRequestSupportingFilesOpen,
    onClose: onRequestSupportingFilesClose,
  } = useDisclosure();

  const [hideRevisionList, setHideRevisionList] = useState(false);
  const [hasUnsavedEdits, setHasUnsavedEdits] = useState(false);
  const [saveEditsCompleted, setSaveEditsCompleted] = useState(false);
  const [saveEditsDisabled, setSaveEditsDisabled] = useState(false);
  const [supportRequestDate, setSupportRequestDate] = useState(null);

  const sendRevisionContainerRef = useRef<HTMLDivElement | null>(null);

  const permitHeaderRef = useRef();

  useEffect(() => {
    reset({ referenceNumber: currentPermitApplication?.referenceNumber || '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPermitApplication?.referenceNumber]);

  useEffect(() => {
    if (currentPermitApplication) {
      currentPermitApplication.markAsViewed();
    }
  }, [currentPermitApplication]);

  useEffect(() => {
    const container = document.getElementById('permitApplicationFieldsContainer');
    if (!container) return;

    if (currentPermitApplication?.revisionMode) {
      container.classList.add('revision-mode');
    } else {
      container.classList.remove('revision-mode');
    }

    if (currentPermitApplication?.status === EPermitApplicationStatus.revisionsRequested && !saveEditsCompleted) {
      setRevisionMode(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPermitApplication?.revisionMode, currentPermitApplication?.status, saveEditsCompleted]);

  // Monitor for staged revision requests (Save Edits workflow)
  useEffect(() => {
    if (currentPermitApplication?.latestRevisionRequests?.length > 0) {
      setHasUnsavedEdits(true);
    } else {
      setHasUnsavedEdits(false);
    }
  }, [currentPermitApplication?.latestRevisionRequests?.length]);

  useEffect(() => {
    if (currentPermitApplication?.latestSupportRequestDateString) {
      setSupportRequestDate(currentPermitApplication.latestSupportRequestDateString);
    }
  }, [currentPermitApplication?.latestSupportRequestDateString]);

  // Handle revision mode cancellation
  const handleRevisionCancel = async () => {
    try {
      1;
      // Clear revision requests created by admin Save Edits
      const ok = await currentPermitApplication.removeRevisionRequests();

      if (ok) {
        // Navigate back to application view (forces reload and consent modal flow)
        navigate(0);
      }
    } catch (error) {
      console.error('Error canceling revision requests:', error);
      // Fallback: just exit revision mode
      setRevisionMode(false);
    }
  };

  // Handle Save Edits workflow
  const handleSaveEdits = useCallback(async () => {
    // Immediately disable the button to prevent multiple clicks
    setSaveEditsDisabled(true);

    // First: Capture and save current form data
    const formio = formRef.current;
    const submissionData = formio?.data;

    // Save the form data to the application
    // Ensure proper nested structure: submission_data.data = formData
    const updateOk = await currentPermitApplication.update({
      submission_data: {
        data: submissionData,
      },
      nickname: currentPermitApplication.nickname,
    });

    if (!updateOk) {
      return;
    }

    // Finalize revision requests (should change status to revisions_requested)
    const finalizeOk = await currentPermitApplication.finalizeRevisionRequests();

    if (finalizeOk) {
      // Enable the submit button immediately via React state
      setSaveEditsCompleted(true);

      // Check pathway to determine next action
      if (performedBy === 'applicant') {
        // Participant pathway: redirect to submissions inbox
        navigate('/applications');
      } else {
        // Staff pathway: Exit revision mode and scroll to submit button
        setRevisionMode(false);
        setTimeout(() => {
          const submitButton = document.querySelector('button[type="submit"]') as HTMLButtonElement;
          if (submitButton) {
            submitButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 300); // Balanced timeout for React state propagation
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPermitApplication, formRef, performedBy, navigate, setSaveEditsCompleted]);

  if (error) return <ErrorScreen error={error} />;
  if (!currentPermitApplication?.isFullyLoaded) return <LoadingScreen />;

  const { formattedFormJson, number, revisionMode, setRevisionMode } = currentPermitApplication;

  const handleConfirm = async () => {
    try {
      const response = await currentPermitApplication.updateStatus({
        status: EPermitApplicationStatus.inReview,
      });
      if (response.ok) {
        navigate(`/applications/${response?.data?.data?.id}/successful-submission`, {
          state: {
            message: t('energySavingsApplication.new.submitted'),
          },
        });
      }
    } catch (e) {
      // Handle error if needed
    }
    onScreenInclose();
  };

  // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'string | number | readonly stri... Remove this comment to see the full error message
  const permitHeaderHeight = permitHeaderRef?.current?.offsetHeight ?? 0;

  return (
    <Box as="main" id="reviewing-permit-application">
      <Flex id="permitHeader" direction="column" position="sticky" top={0} zIndex={12} ref={permitHeaderRef}>
        <Flex w="full" px={6} py={3} bg="theme.blue" justify="space-between" color="greys.white">
          <HStack gap={4} flex={1}>
            <EnergySavingsApplicationStatusTag energySavingsApplication={currentPermitApplication} />
            <Flex direction="column" w="full">
              <Heading fontSize="xl" as="h3">
                {currentPermitApplication.fullAddress}
              </Heading>
              <Text noOfLines={1}>{currentPermitApplication.nickname}</Text>
              <HStack>
                <CopyableValue
                  textTransform={'uppercase'}
                  value={number}
                  label={t('permitApplication.fields.number')}
                />
              </HStack>
            </Flex>
          </HStack>
          <Stack direction={{ base: 'column', lg: 'row' }} align={{ base: 'flex-end', lg: 'center' }}>
            <SupportingFilesRequestModal permitApplication={currentPermitApplication} />
            <SubmissionDownloadModal permitApplication={currentPermitApplication} review />
            <Button variant="primary" rightIcon={<CaretRight />} onClick={() => navigate(`/submission-inbox`)}>
              {t('ui.backToInbox')}
            </Button>
            {revisionMode &&
              // Show for internal applications (always admin-on-behalf)
              (currentPermitApplication?.audienceType?.code === 'internal' ||
                // Show for external applications when admin selected "on behalf" pathway
                (currentPermitApplication?.audienceType?.code === 'external' && performedBy === 'staff')) && (
                <Button
                  bg="white"
                  color="text.primary"
                  border="1px solid"
                  borderColor="border.light"
                  isDisabled={!hasUnsavedEdits || saveEditsDisabled}
                  onClick={handleSaveEdits}
                >
                  {t('energySavingsApplication.show.saveEdits')}
                </Button>
              )}
          </Stack>
        </Flex>
        {revisionMode && (
          <Flex
            position="sticky"
            zIndex={11}
            w="full"
            px={4}
            py={2}
            bg="theme.yellow"
            justify="flex-start"
            align="center"
            gap={4}
            top={permitHeaderHeight}
          >
            <Flex width={'sidebar.width'} align="center" gap={2}>
              <NotePencil size={24} />
              <Heading fontSize="lg" mt={2}>
                {t('energySavingsApplication.show.updatesTracker')}
              </Heading>
              <Spacer />
              <Button
                fontSize="sm"
                h={8}
                p={1}
                variant="secondary"
                rightIcon={hideRevisionList ? <CaretDown /> : <CaretUp />}
                onClick={() => setHideRevisionList((cur) => !cur)}
              >
                {hideRevisionList ? t('permitApplication.show.showList') : t('permitApplication.show.hideList')}
              </Button>
              <Divider orientation="vertical" height="24px" mx={4} borderColor="greys.grey01" />
            </Flex>
            <Flex align="center" gap={2} flex={1} justify="flex-end" ref={sendRevisionContainerRef}></Flex>
          </Flex>
        )}
        {currentPermitApplication.sandbox && (
          <SandboxHeader borderTopRadius={0} override sandbox={currentPermitApplication.sandbox} position="sticky" />
        )}
      </Flex>
      {supportRequestDate && (
        <Flex direction="column" bg="theme.orangeLight02">
          <Flex
            top={permitHeaderHeight}
            position="sticky"
            zIndex={11}
            w="full"
            px={4}
            py={2}
            mt={2}
            bg="theme.orangeLight02"
            justify="flex-start"
            align="left"
            gap={4}
          >
            <Warning size={24} color="var(--chakra-colors-semantic-warning)" aria-label={'Warning icon'} />
            <Heading fontSize="md">{t('energySavingsApplication.show.supportingFilesRequest.requestedHeader')}</Heading>
          </Flex>
          <Flex
            direction="column"
            position="sticky"
            zIndex={11}
            w="full"
            px={14}
            mb={3}
            bg="theme.orangeLight02"
            justify="flex-start"
            align="left"
            gap={4}
          >
            <Trans
              i18nKey="energySavingsApplication.show.supportingFilesRequest.requestedText"
              values={{ date: supportRequestDate }}
            />
          </Flex>
        </Flex>
      )}
      <Box id="sidebar-and-form-container" sx={{ '&:after': { content: `""`, display: 'block', clear: 'both' } }}>
        {revisionMode && !hideRevisionList ? (
          <RevisionSideBar
            permitApplication={currentPermitApplication}
            onCancel={handleRevisionCancel}
            sendRevisionContainerRef={sendRevisionContainerRef}
            updatePerformedBy={performedBy}
          />
        ) : (
          <ChecklistSideBar permitApplication={currentPermitApplication} completedBlocks={completedBlocks} />
        )}
        {formattedFormJson && (
          <Flex flex={1} direction="column" pt={8} position={'relative'} id="permitApplicationFieldsContainer" gap={8}>
            <RequirementForm
              formRef={formRef}
              permitApplication={currentPermitApplication}
              onCompletedBlocksChange={setCompletedBlocks}
              showHelpButton
              performedBy={performedBy}
              saveEditsCompleted={saveEditsCompleted}
              renderTopButtons={() => {
                return (
                  !revisionMode && (
                    <HStack spacing={6}>
                      <Button
                        variant="calloutInverse"
                        leftIcon={<NotePencil />}
                        px={14}
                        onClick={onUpdatePathwayOpen}
                        borderColor="theme.yellow"
                        isDisabled={
                          currentPermitApplication?.status === EPermitApplicationStatus.inReview ||
                          currentPermitApplication?.status === EPermitApplicationStatus.ineligible
                        }
                      >
                        {t('permitApplication.show.update')}
                      </Button>

                      <Button
                        variant="calloutInverse"
                        leftIcon={<CheckCircle />}
                        px={14}
                        onClick={onScreenIn}
                        borderColor="green"
                        isDisabled={
                          currentPermitApplication?.status === EPermitApplicationStatus.ineligible ||
                          currentPermitApplication?.status === EPermitApplicationStatus.inReview
                        }
                      >
                        {t('permitApplication.show.screenIn')}
                      </Button>
                      <Button
                        variant="calloutInverse"
                        leftIcon={<Prohibit />}
                        px={14}
                        onClick={onOpen}
                        borderColor="red"
                        isDisabled={
                          currentPermitApplication?.status === EPermitApplicationStatus.inReview ||
                          currentPermitApplication?.status === EPermitApplicationStatus.ineligible
                        }
                      >
                        {t('permitApplication.show.inEligible')}
                      </Button>
                    </HStack>
                  )
                );
              }}
              isEditing={
                currentPermitApplication?.status === 'draft' ||
                ((currentUser?.role === 'admin' || currentUser?.role === 'admin_manager') && revisionMode)
              }
              updateCollaborationAssignmentNodes={updateRequirementBlockAssignmentNode}
            />
          </Flex>
        )}
      </Box>
      {onOpen && (
        <ApplicationReviewModal
          isOpen={isOpen}
          onClose={onClose}
          onConfirm={() => navigate(`/rejection-reason/${currentPermitApplication.id}/${number}`)}
          title={t('permitApplication.review.readyToMarkIneligible')}
          message={t('permitApplication.review.confirmIneligible')}
        />
      )}
      {isUpdatePathwayOpen && (
        <UpdatePathwayModal
          isOpen={isUpdatePathwayOpen}
          onClose={onUpdatePathwayClose}
          setRevisionMode={setRevisionMode}
          setPerformedBy={(performedByValue: string) => {
            setPerformedBy(performedByValue);
          }}
          permitApplication={currentPermitApplication}
        />
      )}
      {isScreenIn && (
        <ApplicationReviewModal
          isOpen={isScreenIn}
          onClose={onScreenInclose}
          onConfirm={handleConfirm}
          title={t('permitApplication.review.readyToScreen')}
          message={t('permitApplication.review.confirmReview')}
        />
      )}
      {isContactsOpen && (
        <ContactSummaryModal
          isOpen={isContactsOpen}
          onOpen={onContactsOpen}
          onClose={onContactsClose}
          permitApplication={currentPermitApplication}
        />
      )}
      {isRequestSupportingFilesOpen && (
        <SupportingFilesRequestModal
          onOpen={onRequestSupportingFilesOpen}
          onClose={onRequestSupportingFilesClose}
          permitApplication={currentPermitApplication}
        />
      )}
      {requirementBlockAssignmentNodes.map((requirementBlockAssignmentNode) => {
        return (
          <BlockCollaboratorAssignmentManagement
            key={requirementBlockAssignmentNode.requirementBlockId}
            requirementBlockAssignmentNode={requirementBlockAssignmentNode}
            permitApplication={currentPermitApplication}
            collaborationType={ECollaborationType.review}
          />
        );
      })}
    </Box>
  );
});
