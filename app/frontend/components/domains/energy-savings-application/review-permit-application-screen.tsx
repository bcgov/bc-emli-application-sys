import { Box, Button, Divider, Flex, HStack, Heading, Spacer, Stack, Text, useDisclosure } from '@chakra-ui/react';
import {
  CaretDownIcon,
  CaretRightIcon,
  CaretUpIcon,
  CheckCircleIcon,
  NotePencilIcon,
  ProhibitIcon,
} from '@phosphor-icons/react';
import { observer } from 'mobx-react-lite';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation, Trans } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { IContractor } from '../../../models/contractor';
import { usePermitApplication } from '../../../hooks/resources/use-permit-application';
import { useMst } from '../../../setup/root';
import { ECollaborationType, EPermitApplicationStatus, EFlashMessageStatus } from '../../../types/enums';
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
//import ApplicationReviewModal from '../../shared/modals/application-review-modal';
import { GlobalConfirmationModal } from '../../shared/modals/global-confirmation-modal';
import UpdatePathwayModal from '../../shared/modals/application-update-pathway';
import AddSupportingFilesPathwayModal from '../../shared/modals/add-supporting-files-pathway-modal';
import { EnergySavingsApplicationStatusTag } from '../../shared/energy-savings-applications/energy-savings-application-status-tag';
import { SupportingFilesRequestModal } from './supporting-files-request-modal';
import {
  EPermitClassificationCode,
  EUserRoles,
  EOnboardingRevisionFields,
  EContractorRevisionFields,
  EUpdateRoles,
  ERevisionSideBarItems,
} from '../../../types/enums';
import { INVOICE_SUBMISSION_TYPES } from '../../../constants';
import { useLocation } from 'react-router-dom';
interface IReferenceNumberForm {
  referenceNumber?: string;
}

export const ReviewPermitApplicationScreen = observer(() => {
  const { userStore } = useMst();
  const currentUser = userStore.currentUser;
  const { currentPermitApplication, error } = usePermitApplication({ review: true });
  const { t } = useTranslation();
  const location = useLocation();
  const { backToPage } = location.state || {};
  const formRef = useRef(null);
  const isAdminUser = [EUserRoles.admin, EUserRoles.adminManager].indexOf(currentUser.role) >= 0;
  const isEditContractor =
    currentPermitApplication?.submissionType?.code === EPermitClassificationCode.onboarding && isAdminUser;

  const displayName = isEditContractor
    ? (currentPermitApplication?.submitter as IContractor)?.businessName || currentPermitApplication?.nickname
    : currentPermitApplication?.nickname;

  // Fallback for back navigation
  const backNavigation = isEditContractor ? backToPage || '/submission-inbox' : '/submission-inbox';

  const revisionButtonsToDisable = isEditContractor
    ? Object.values(EContractorRevisionFields).map((f) => `${f}-revision-button`)
    : [];

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
  const { isOpen: isIneligibleOpen, onOpen: onIneligibleOpen, onClose: onIneligibleClose } = useDisclosure();
  const { isOpen: isScreenIn, onOpen: onScreenIn, onClose: onScreenInclose } = useDisclosure();
  const { isOpen: isTrainingPending, onOpen: onTrainingPending, onClose: onTrainingPendingClose } = useDisclosure();
  const {
    isOpen: isContractorApproval,
    onOpen: onContractorApproval,
    onClose: onContractorApprovalClose,
  } = useDisclosure();
  const { isOpen: isContactsOpen, onOpen: onContactsOpen, onClose: onContactsClose } = useDisclosure();
  const { isOpen: isUpdatePathwayOpen, onOpen: onUpdatePathwayOpen, onClose: onUpdatePathwayClose } = useDisclosure();
  const {
    isOpen: isAddSupportingFilesPathwayOpen,
    onOpen: onAddSupportingFilesPathwayOpen,
    onClose: onAddSupportingFilesPathwayClose,
  } = useDisclosure();
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
  const submissionTypeCode = currentPermitApplication?.submissionType?.code as EPermitClassificationCode | undefined;
  const isInvoiceSubmission = submissionTypeCode ? INVOICE_SUBMISSION_TYPES.has(submissionTypeCode) : false;

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

    // Apply revision requests (different method based on workflow type)
    const finalizeOk = isEditContractor
      ? await currentPermitApplication.applyRevisionRequestsWithoutStateChange()
      : await currentPermitApplication.finalizeRevisionRequests();

    if (finalizeOk) {
      if (isEditContractor) {
        // Contractor: stay on page, keep fields editable, can make more changes
        // navigate(backNavigation);
        setSaveEditsDisabled(false);
      } else if (performedBy === 'applicant') {
        // Participant pathway: redirect to submissions inbox
        setSaveEditsCompleted(true);
        navigate('/applications');
      } else {
        // Staff pathway: Exit revision mode and scroll to submit button
        setSaveEditsCompleted(true);
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

  if (
    currentPermitApplication.submissionType?.code === EPermitClassificationCode.onboarding &&
    [EUserRoles.admin, EUserRoles.adminManager].indexOf(currentUser.role) >= 0
  ) {
    if (!performedBy) {
      setPerformedBy(EUpdateRoles.staff);
    }
    setRevisionMode(true);
  }

  const handleReadyForTraining = async () => {
    try {
      const response = await currentPermitApplication.updateStatus({
        status: EPermitApplicationStatus.trainingPending,
      });
      if (response.ok) {
        navigate(`/applications/${response?.data?.data?.id}/successful-training-pending`, {
          state: {
            submissionType: currentPermitApplication.submissionType.name,
            applicationNumber: currentPermitApplication?.number,
          },
        });
      }
    } catch (e) {
      // Handle error if needed
    }
    onTrainingPendingClose();
  };

  const handleOnboardingApproval = async () => {
    try {
      const response = await currentPermitApplication.approve();
      if (response.ok) {
        navigate(`/applications/${response?.data?.data?.id}/onboarding-approved`, {
          state: {
            submissionType: currentPermitApplication.submissionType.name,
            applicationNumber: currentPermitApplication?.number,
          },
        });
      }
    } catch (e) {
      // Handle error if needed
    }
    onContractorApprovalClose();
  };

  const handleApprovePending = async () => {
    try {
      await currentPermitApplication.updateStatus({
        status: EPermitApplicationStatus.approvedPending,
      });
    } catch (e) {
      // Handle error if needed
    }
  };

  const handleMarkPaid = async () => {
    try {
      await currentPermitApplication.updateStatus({
        status: EPermitApplicationStatus.approvedPaid,
      });
    } catch (e) {
      // Handle error if needed
    }
  };

  const handleConfirm = async () => {
    try {
      const response = await currentPermitApplication.updateStatus({
        status: EPermitApplicationStatus.inReview,
      });
      if (response.ok) {
        navigate(`/applications/${response?.data?.data?.id}/screened-in-success`, {
          state: {
            submissionType: currentPermitApplication.submissionType.name,
            applicationNumber: currentPermitApplication?.number,
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
            {!isEditContractor && (
              <EnergySavingsApplicationStatusTag energySavingsApplication={currentPermitApplication} />
            )}
            <Flex direction="column" w="full">
              <Heading fontSize="xl" as="h3">
                {currentPermitApplication.fullAddress}
              </Heading>
              <Text noOfLines={1}>{displayName}</Text>
              <HStack>
                <CopyableValue
                  textTransform={'uppercase'}
                  value={number}
                  label={
                    isEditContractor ? t('permitApplication.fields.number') : t('contractorOnboarding.contractorId')
                  }
                />
              </HStack>
            </Flex>
          </HStack>
          <Stack direction={{ base: 'column', lg: 'row' }} align={{ base: 'flex-end', lg: 'center' }}>
            {!isEditContractor && !isInvoiceSubmission && (
              <Button variant="primary" onClick={onAddSupportingFilesPathwayOpen}>
                {t('energySavingsApplication.show.supportingFilesRequest.addSupportingFiles')}
              </Button>
            )}
            <SubmissionDownloadModal
              permitApplication={currentPermitApplication}
              review
              {...(isEditContractor ? { showIcon: false } : null)}
            />

            <Button
              variant="primary"
              rightIcon={<CaretRightIcon />}
              onClick={() => {
                navigate(backNavigation);
              }}
            >
              {isEditContractor ? t('ui.back') : t('ui.backToInbox')}
            </Button>

            {revisionMode && !(isAdminUser && performedBy === EUpdateRoles.applicant) && (
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
              <NotePencilIcon size={24} />
              <Heading fontSize="lg" mt={2}>
                {isEditContractor
                  ? t('energySavingsApplication.show.reviewNotes')
                  : t('energySavingsApplication.show.updatesTracker')}
              </Heading>
              <Spacer />
              <Button
                fontSize="sm"
                h={8}
                p={1}
                variant="secondary"
                rightIcon={hideRevisionList ? <CaretDownIcon /> : <CaretUpIcon />}
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
      <Box id="sidebar-and-form-container" sx={{ '&:after': { content: `""`, display: 'block', clear: 'both' } }}>
        {revisionMode && !hideRevisionList ? (
          <RevisionSideBar
            permitApplication={currentPermitApplication}
            onCancel={handleRevisionCancel}
            sendRevisionContainerRef={sendRevisionContainerRef}
            updatePerformedBy={performedBy}
            isEditContractor={isEditContractor}
            {...(isEditContractor
              ? {
                  showRevisionItems: [
                    ERevisionSideBarItems.SELECTED_ITEMS_TOP_ALIGN,
                    ERevisionSideBarItems.SELECTED_ITEMS_BOTTOM_ALIGN,
                  ],
                }
              : null)}
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
              buttonsToDisable={isEditContractor ? revisionButtonsToDisable : []}
              showSiteWarning={false}
              renderTopButtons={() => {
                return (
                  (!revisionMode || isEditContractor) && (
                    <HStack spacing={6}>
                      {!isEditContractor && (
                        <Button
                          variant="calloutInverse"
                          leftIcon={<NotePencilIcon />}
                          px={14}
                          onClick={onUpdatePathwayOpen}
                          borderColor="theme.yellow"
                          isDisabled={
                            currentPermitApplication?.status === EPermitApplicationStatus.ineligible ||
                            (currentPermitApplication?.status === EPermitApplicationStatus.inReview &&
                              !isInvoiceSubmission)
                          }
                        >
                          {t('energySavingsApplication.show.update')}
                        </Button>
                      )}
                      {currentPermitApplication.submissionType?.code !== EPermitClassificationCode.onboarding &&
                        !isInvoiceSubmission && (
                          <Button
                            variant="calloutInverse"
                            leftIcon={<CheckCircleIcon />}
                            px={14}
                            onClick={onScreenIn}
                            borderColor="green"
                            isDisabled={
                              currentPermitApplication?.status === EPermitApplicationStatus.ineligible ||
                              currentPermitApplication?.status === EPermitApplicationStatus.inReview
                            }
                          >
                            {t('energySavingsApplication.show.screenIn')}
                          </Button>
                        )}
                      {currentPermitApplication.submissionType?.code === EPermitClassificationCode.onboarding &&
                      currentPermitApplication?.status !== EPermitApplicationStatus.trainingPending ? (
                        <Button
                          variant="calloutInverse"
                          px={14}
                          onClick={onTrainingPending}
                          borderColor="green"
                          isDisabled={
                            hasUnsavedEdits ||
                            currentPermitApplication?.status === EPermitApplicationStatus.ineligible ||
                            currentPermitApplication?.status === EPermitApplicationStatus.approved
                          }
                        >
                          {t('energySavingsApplication.show.readyForTraining')}
                        </Button>
                      ) : isInvoiceSubmission ? (
                        currentPermitApplication?.status === EPermitApplicationStatus.approvedPending ? (
                          <Button
                            variant="calloutInverse"
                            px={14}
                            onClick={handleMarkPaid}
                            borderColor="green"
                            isDisabled={
                              currentPermitApplication?.status !== EPermitApplicationStatus.approvedPending ||
                              currentPermitApplication?.status === EPermitApplicationStatus.ineligible
                            }
                          >
                            {t('energySavingsApplication.show.markPaid')}
                          </Button>
                        ) : currentPermitApplication?.status === EPermitApplicationStatus.inReview ? (
                          <Button
                            variant="calloutInverse"
                            px={14}
                            onClick={handleApprovePending}
                            borderColor="green"
                            isDisabled={
                              currentPermitApplication?.status !== EPermitApplicationStatus.inReview ||
                              currentPermitApplication?.status === EPermitApplicationStatus.ineligible
                            }
                          >
                            {t('energySavingsApplication.show.approvePending')}
                          </Button>
                        ) : null
                      ) : (
                        <Button
                          variant="calloutInverse"
                          px={14}
                          onClick={onContractorApproval}
                          borderColor="green"
                          isDisabled={
                            hasUnsavedEdits ||
                            currentPermitApplication?.status === EPermitApplicationStatus.ineligible ||
                            currentPermitApplication?.status === EPermitApplicationStatus.approved
                          }
                        >
                          {t('ui.approve')}
                        </Button>
                      )}
                      <Button
                        variant="calloutInverse"
                        leftIcon={!isEditContractor && <ProhibitIcon />}
                        px={14}
                        onClick={onIneligibleOpen}
                        borderColor="red"
                        isDisabled={
                          hasUnsavedEdits ||
                          currentPermitApplication?.status === EPermitApplicationStatus.inReview ||
                          currentPermitApplication?.status === EPermitApplicationStatus.ineligible ||
                          currentPermitApplication?.status === EPermitApplicationStatus.approved ||
                          currentPermitApplication?.status === EPermitApplicationStatus.approvedPending ||
                          currentPermitApplication?.status === EPermitApplicationStatus.approvedPaid ||
                          (currentPermitApplication?.status === EPermitApplicationStatus.inReview &&
                            !isInvoiceSubmission)
                        }
                      >
                        {!isEditContractor
                          ? t('energySavingsApplication.show.inEligible')
                          : t('energySavingsApplication.show.markIneligible')}
                      </Button>
                    </HStack>
                  )
                );
              }}
              isEditing={
                currentPermitApplication?.status === 'draft' ||
                ([EUserRoles.admin, EUserRoles.adminManager].indexOf(currentUser.role) >= 0 && revisionMode)
              }
              updateCollaborationAssignmentNodes={updateRequirementBlockAssignmentNode}
            />
          </Flex>
        )}
      </Box>
      {onIneligibleOpen && (
        <GlobalConfirmationModal
          isOpen={isIneligibleOpen}
          onClose={onIneligibleClose}
          onSubmit={() => navigate(`/rejection-reason/${currentPermitApplication.id}`)}
          headerText={
            isEditContractor
              ? t('permitApplication.review.contractor.readyToMarkIneligible')
              : t('permitApplication.review.readyToMarkIneligible')
          }
          bodyText={t('permitApplication.review.confirmIneligible', {
            submissionType: currentPermitApplication?.submissionType?.name?.toLowerCase(),
          })}
          confirmText={t('ui.confirm')}
          cancelText={t('ui.cancel')}
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
      {isAddSupportingFilesPathwayOpen && (
        <AddSupportingFilesPathwayModal
          isOpen={isAddSupportingFilesPathwayOpen}
          onClose={onAddSupportingFilesPathwayClose}
          permitApplication={currentPermitApplication}
        />
      )}
      {isScreenIn && (
        <GlobalConfirmationModal
          isOpen={isScreenIn}
          onClose={onScreenInclose}
          onSubmit={handleConfirm}
          headerText={t('permitApplication.review.readyToScreen')}
          bodyText={t('permitApplication.review.confirmReview', {
            submissionType: currentPermitApplication?.submissionType?.name?.toLowerCase(),
          })}
          confirmText={t('ui.confirm')}
          cancelText={t('ui.cancel')}
        />
      )}
      {isTrainingPending && (
        <GlobalConfirmationModal
          isOpen={isTrainingPending}
          onClose={onTrainingPendingClose}
          onSubmit={handleReadyForTraining}
          headerText={t('contractorOnboarding.trainingPending.confirmReadyTitle')}
          bodyText={t('contractorOnboarding.trainingPending.confirmReadyMessage', {
            submissionType: currentPermitApplication?.submissionType?.name?.toLowerCase(),
          })}
          confirmText={t('ui.confirm')}
          cancelText={t('ui.cancel')}
        />
      )}
      {isContractorApproval && (
        <GlobalConfirmationModal
          isOpen={isContractorApproval}
          onClose={onContractorApprovalClose}
          onSubmit={handleOnboardingApproval}
          headerText={t('contractorOnboarding.approval.confirmTitle')}
          bodyText={t('contractorOnboarding.approval.confirmMessage', {
            submissionType: currentPermitApplication?.submissionType?.name?.toLowerCase(),
          })}
          confirmText={t('ui.confirm')}
          cancelText={t('ui.cancel')}
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
