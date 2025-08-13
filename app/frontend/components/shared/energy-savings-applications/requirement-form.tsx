import { Box, Button, Center, Flex, Link, Text, useDisclosure, VStack } from '@chakra-ui/react';
import { observer } from 'mobx-react-lite';

import { ArrowSquareOut } from '@phosphor-icons/react';
import { format } from 'date-fns';
import * as R from 'ramda';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useMountStatus } from '../../../hooks/use-mount-status';
import { IEnergySavingsApplication } from '../../../models/energy-savings-application';
import { IErrorsBoxData } from '../../../types/types';
import { getCompletedBlocksFromForm, getRequirementByKey } from '../../../utils/formio-component-traversal';
import { singleRequirementFormJson, singleRequirementSubmissionData } from '../../../utils/formio-helpers';
import { CompareRequirementsBox } from '../../domains/energy-savings-application/compare-requirements-box';
import { ErrorsBox } from '../../domains/energy-savings-application/errors-box';
import { BuilderBottomFloatingButtons } from '../../domains/requirement-template/builder-bottom-floating-buttons';
import { CustomMessageBox } from '../base/custom-message-box';
import { SharedSpinner } from '../base/shared-spinner';
import { Form, defaultOptions } from '../chefs';
import { ContactModal } from '../contact/contact-modal';
import { PreviousSubmissionModal } from '../revisions/previous-submission-modal';
import { PermitApplicationSubmitModal } from './permit-application-submit-modal';
import { useMst } from '../../../setup/root';

interface IRequirementFormProps {
  permitApplication?: IEnergySavingsApplication;
  onCompletedBlocksChange?: (sections: any) => void;
  formRef: any;
  triggerSave?: (params?: { autosave?: boolean; skipPristineCheck?: boolean }) => void;
  showHelpButton?: boolean;
  renderSaveButton?: () => JSX.Element;
  isEditing?: boolean;
  renderTopButtons?: () => React.ReactNode;
  updateCollaborationAssignmentNodes?: () => void;
  performedBy?: string;
  saveEditsCompleted?: boolean;
}

export const RequirementForm = observer(
  ({
    permitApplication,
    onCompletedBlocksChange,
    formRef,
    triggerSave,
    renderTopButtons,
    renderSaveButton,
    isEditing = false,
    updateCollaborationAssignmentNodes,
    performedBy,
    saveEditsCompleted = false,
  }: IRequirementFormProps) => {
    const {
      jurisdiction,
      submissionData,
      setSelectedTabIndex,
      indexOfBlockId,
      formJson,
      blockClasses,
      formattedFormJson,
      isDraft,
      isScreenedIn,
      isIneligible,
      previousSubmissionVersion,
      selectedPastSubmissionVersion,
      isViewingPastRequests,
    } = permitApplication;

    const shouldShowDiff = permitApplication?.shouldShowApplicationDiff(isEditing);
    const userShouldSeeDiff = permitApplication?.currentUserShouldSeeApplicationDiff;
    const isSubmitted = permitApplication?.isSubmitted;
    const { userStore } = useMst();
    const { currentUser } = userStore;

    const pastVersion = isViewingPastRequests ? selectedPastSubmissionVersion : previousSubmissionVersion;
    const isMounted = useMountStatus();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { isOpen, onOpen, onClose } = useDisclosure();
    const boxRef = useRef<HTMLDivElement>(null);

    const [wrapperClickCount, setWrapperClickCount] = useState(0);
    const [errorBoxData, setErrorBoxData] = useState<IErrorsBoxData[]>([]); // an array of Labels and links to the component
    const [imminentSubmission, setImminentSubmission] = useState(null);
    const [floatErrorBox, setFloatErrorBox] = useState(false);
    const [hasErrors, setHasErrors] = useState(false);
    const [autofillContactKey, setAutofillContactKey] = useState(null);
    const [previousSubmissionKey, setPreviousSubmissionKey] = useState(null);
    const [firstComponentKey, setFirstComponentKey] = useState(null);
    const [isCollapsedAll, setIsCollapsedAllState] = useState(false);

    const [unsavedSubmissionData, setUnsavedSubmissionData] = useState(() => R.clone(submissionData));

    const handleSetUnsavedSubmissionData = (data) => {
      permitApplication.setIsDirty(true);
      setUnsavedSubmissionData(data);
    };

    const { isOpen: isContactsOpen, onOpen: onContactsOpen, onClose: onContactsClose } = useDisclosure();
    const {
      isOpen: isPreviousSubmissionOpen,
      onOpen: onPreviousSubmissionOpen,
      onClose: onPreviousSubmissionClose,
    } = useDisclosure();

    const infoBoxData = permitApplication.diffToInfoBoxData;

    useEffect(() => {
      if (shouldShowDiff && userShouldSeeDiff) {
        permitApplication.fetchDiff();
      }
    }, []);

    useEffect(() => {
      // The box observers need to be re-registered whenever a panel is collapsed
      // This triggers a re-registration whenever the body of the box is clicked
      // Click listener must be registered this way because formIO prevents bubbling

      const box = boxRef.current;
      const handleClick = () => {
        setWrapperClickCount((n) => n + 1);
      };
      box?.addEventListener('click', handleClick);
      return () => {
        box?.removeEventListener('click', handleClick);
      };
    }, []);

    useEffect(() => {
      if (hasErrors) {
        window.addEventListener('scroll', onScroll);
      } else {
        window.removeEventListener('scroll', onScroll);
      }
      return () => {
        window.removeEventListener('scroll', onScroll);
      };
    }, [hasErrors]);

    useEffect(() => {
      // This useEffect registers the intersection observers for the panels
      // It uses a thin line running across the middle of the screen
      // and detects when this line covers at least a small percentage of the panel

      // Problems with render timing necessitates the use of this isMounted state
      if (!isMounted) return;

      const formComponentNodes = document.querySelectorAll('.formio-component');

      const blockNodes = Array.from(formComponentNodes).filter((node) =>
        Array.from(node.classList).some((className) => blockClasses.includes(className)),
      );
      const viewportHeight = window.innerHeight; // Get the viewport height
      const topValue = -viewportHeight / 2 + 5;
      const bottomValue = -viewportHeight / 2 + 5;
      const rootMarginValue = `${topValue}px 0px ${bottomValue}px 0px`;
      const blockOptions = {
        rootMargin: rootMarginValue,
        threshold: 0.0001, // Adjust threshold based on needs
      };

      const blockObserver = new IntersectionObserver(handleBlockIntersection, blockOptions);

      Object.values(blockNodes).forEach((ref) => {
        if (ref) {
          blockObserver.observe(ref);
        }
      });

      return () => {
        blockObserver.disconnect();
      };
    }, [formJson, isMounted, window.innerHeight, wrapperClickCount]);

    const handleOpenStepCode = async (_event) => {
      await triggerSave?.();
      navigate('step-code', { state: { enableStepCodeRoute: true } });
    };

    const handleOpenContactAutofill = async (event) => {
      setAutofillContactKey(event.detail.key);
      onContactsOpen();
    };

    const handleOpenPreviousSubmission = async (event) => {
      setPreviousSubmissionKey(event.detail.key);
      onPreviousSubmissionOpen();
    };

    useEffect(() => {
      document.addEventListener('openStepCode', handleOpenStepCode);
      document.addEventListener('openAutofillContact', handleOpenContactAutofill);
      document.addEventListener('openPreviousSubmission', handleOpenPreviousSubmission);
      return () => {
        document.removeEventListener('openStepCode', handleOpenStepCode);
        document.removeEventListener('openAutofillContact', handleOpenContactAutofill);
        document.removeEventListener('openPreviousSubmission', handleOpenPreviousSubmission);
      };
    }, []);

    const setIsCollapsedAll = (isCollapsedAll: boolean) => {
      if (isCollapsedAll) {
        document
          .querySelectorAll('.formio-collapse-icon.fa-minus-square-o')
          .forEach((el: HTMLDivElement) => el.click());
      } else {
        document.querySelectorAll('.formio-collapse-icon.fa-plus-square-o').forEach((el: HTMLDivElement) => el.click());
      }
      setIsCollapsedAllState(isCollapsedAll);
    };

    const mapErrorBoxData = (errors) =>
      errors.map((error) => {
        return { label: error.component.label, id: error.component.id, class: error.component.class };
      });

    function handleBlockIntersection(entries: IntersectionObserverEntry[]) {
      const entry = entries.filter((en) => en.isIntersecting)[0];
      if (!entry) return;

      const itemWithSectionClassName = Array.from(entry.target.classList).find(
        (className) =>
          className.includes('formio-component-formSubmissionDataRSTsection') ||
          className.includes('formio-component-section-signoff-key'),
      );

      if (itemWithSectionClassName) {
        const classNameParts = itemWithSectionClassName.split('|');
        const blockId = classNameParts[classNameParts.length - 1].slice(-36);
        setSelectedTabIndex(indexOfBlockId(blockId));
      }
    }

    const onFormSubmit = async (submission: any) => {
      setHasErrors(null);
      setImminentSubmission(submission);
      onOpen();
    };

    const onModalSubmit = async () => {
      if (
        await permitApplication.submit({
          submissionData: imminentSubmission,
          nickname: permitApplication.nickname,
        })
      ) {
        navigate(`/applications/${permitApplication.id}/successful-submission`, {
          state: {
            message: t('energySavingsApplication.new.sucessfulSubmission'),
          },
        });
      }
    };

    const onBlur = (containerComponent) => {
      if (onCompletedBlocksChange) {
        onCompletedBlocksChange(getCompletedBlocksFromForm(containerComponent.root));
      }
    };
    const onScroll = (event) => {
      setFloatErrorBox(hasErrors && isFirstComponentNearTopOfView(firstComponentKey));
    };

    const onChange = (changedEvent) => {
      //in the case of a multi select box, there is a change but no onblur bubbled up
      if (changedEvent?.changed?.component?.type == 'selectboxes') {
        if (onCompletedBlocksChange) {
          onCompletedBlocksChange(getCompletedBlocksFromForm(changedEvent?.changed?.instance?.root));
        }
        setErrorBoxData(mapErrorBoxData(changedEvent?.changed?.instance?.root?.errors));
      }
      if (changedEvent?.changed?.component?.type == 'simplefile') {
        //https://github.com/formio/formio.js/blob/4.19.x/src/components/file/File.unit.js
        // formio `pristine` is not set for file upldates
        // using `setPristine(false)` causes the entire form to validate so instead, we use a separate dirty state
        // trigger save to rerun compliance and save file
        triggerSave?.({ autosave: true, skipPristineCheck: true });
      }
    };

    const onInitialized = (event) => {
      if (!formRef.current) return;

      updateCollaborationAssignmentNodes?.();

      if (onCompletedBlocksChange) {
        onCompletedBlocksChange(getCompletedBlocksFromForm(formRef.current));
      }
      setErrorBoxData(mapErrorBoxData(formRef.current.errors));
    };

    const formReady = (rootComponent) => {
      formRef.current = rootComponent;

      rootComponent.on('change', (_) => {
        // whenever a form data changes, we update the state of ErrorBox with the new error information
        setErrorBoxData(mapErrorBoxData(formRef.current.errors));
      });

      rootComponent.on('submitError', (error) => {
        // when the form attempts to submit but has validation errors, we set a flag to show ErrorBox
        setHasErrors(true);
        setErrorBoxData(mapErrorBoxData(formRef.current.errors));
      });

      const firstComponent = rootComponent.form.components[0];
      setFirstComponentKey(firstComponent.key);
    };
    // formio-component-${requirementJson.key}
    const isAdminUser = currentUser?.role === 'admin' || currentUser?.role === 'admin_manager';
    // Trust the parent component's isEditing logic - it already handles pathway context
    const shouldAllowAdminEditing = isAdminUser && isEditing;

    // Process form JSON to handle field editability based on pathway
    const processedFormJson = useMemo(() => {
      if (!formattedFormJson) return formattedFormJson;

      const clonedFormJson = JSON.parse(JSON.stringify(formattedFormJson));

      // Set individual field disabled states based on isEditing (pathway-aware)
      clonedFormJson.components?.forEach((section: any) => {
        section.components?.forEach((block: any) => {
          block.components?.forEach((requirement: any) => {
            // Handle submit-related components first
            if (
              requirement.key === 'submit' ||
              requirement.key?.includes('acknowledge') ||
              requirement.key?.includes('signature')
            ) {
              // Simple logic using React state instead of complex MobX/backend checks
              const isRealParticipant = currentUser?.role === 'participant';
              const isDraftApp = permitApplication?.status === 'draft' || permitApplication?.status === 'new_draft';
              const isStaffPathway = performedBy === 'staff';

              // Enable submit for:
              // 1. Real participant users
              // 2. Draft applications (new creation)
              // 3. Staff pathway AFTER Save Edits button clicked (simple React state)
              const staffCanSubmit = isDraftApp || (isStaffPathway && saveEditsCompleted);

              requirement.disabled = !(staffCanSubmit || isRealParticipant);
              return;
            }

            // Skip revision buttons - they should always be clickable
            if (requirement.key?.includes('-revision-button')) {
              requirement.disabled = false;
              return;
            }

            // Skip other buttons (but not submit) - let them use default behavior
            if (requirement.type === 'button') {
              return;
            }

            // Set field disabled state - fields only editable after pencil workflow
            // Everyone (including admin staff pathway) must click pencil → "Update Field" first

            // Check if field has been unlocked via pencil workflow (has revision request)
            const revisionRequests = permitApplication?.latestRevisionRequests || [];
            const hasRevisionRequestInLatest = revisionRequests.some(
              (rr) => rr.requirementJson?.key === requirement.key,
            );

            // Field is editable if:
            // 1. Real participant user (always can edit), OR
            // 2. Draft application (new app creation), OR
            // 3. Has revision request (pencil workflow completed) AND isEditing (correct pathway)
            const isRealParticipant = currentUser?.role === 'participant';
            const isDraftApplication =
              permitApplication?.status === 'draft' || permitApplication?.status === 'new_draft';
            const adminCanEdit = hasRevisionRequestInLatest && isEditing;

            requirement.disabled = !(isRealParticipant || isDraftApplication || adminCanEdit);
          });
        });
      });

      return clonedFormJson;
    }, [formattedFormJson, isEditing, saveEditsCompleted]);

    const permitAppOptions = {
      ...defaultOptions,
      // Only use readOnly for application state, not pathway control
      readOnly: isScreenedIn || isIneligible ? true : false,
    };
    permitAppOptions.componentOptions.simplefile.config['formCustomOptions'] = {
      persistFileUploadAction: 'PATCH',
      persistFileUploadUrl: `/api/permit_applications/${permitApplication.id}/upload_supporting_document`,
    };

    const handleUpdatePermitApplicationVersion = () => {
      if (permitApplication.showingCompareAfter) {
        permitApplication.resetCompareAfter();
      } else {
        permitApplication.updateVersion();
      }
    };
    const showVersionDiffContactWarning = shouldShowDiff && !userShouldSeeDiff;
    return (
      <>
        <Flex
          direction="column"
          as={'section'}
          flex={1}
          className={`form-wrapper ${floatErrorBox ? 'float-on' : 'float-off'}`}
          mb="40vh"
          mx="auto"
          pl={{ base: '10' }}
          pr={{ base: '10', xl: 'var(--app-permit-form-right-white-space)' }}
          width="full"
          maxWidth="container.lg"
          gap={8}
          ref={boxRef}
          id="requirement-form-wrapper"
          sx={{
            "[id^='error-list-'].alert.alert-danger > p::before": {
              content: `"${t('requirementTemplate.edit.errorsBox.title', { count: errorBoxData.length })}"`,
            },
          }}
        >
          {renderTopButtons && renderTopButtons()}
          {permitApplication.isLoading && (
            <Center position="fixed" top={0} left={0} right={0} zIndex={12} h="100vh" w="full" bg="greys.overlay">
              <SharedSpinner h={24} w={24} />
            </Center>
          )}
          <ErrorsBox data={errorBoxData} />
          {shouldShowDiff &&
            userShouldSeeDiff &&
            (permitApplication.diff ? (
              <CompareRequirementsBox
                data={infoBoxData}
                handleUpdatePermitApplicationVersion={handleUpdatePermitApplicationVersion}
                showingCompareAfter={permitApplication.showingCompareAfter}
                handleClickDismiss={() => {
                  permitApplication.resetDiff();
                }}
                isUpdatable={permitApplication.isDraft}
              />
            ) : (
              <SharedSpinner position="fixed" right={24} top="50vh" zIndex={12} />
            ))}
          {permitApplication?.isRevisionsRequested && permitApplication?.revisionsRequestedAt && (
            <CustomMessageBox
              description={t('energySavingsApplication.show.revisionsWereRequested', {
                date: format(permitApplication.revisionsRequestedAt, 'MMM d, yyyy h:mm a'),
              })}
              status="warning"
            />
          )}
          {permitApplication?.isSubmitted && (
            <CustomMessageBox
              description={t('energySavingsApplication.show.applicationSubmitted', {
                date: permitApplication?.submittedAt
                  ? format(new Date(permitApplication.submittedAt), 'MMM d, yyyy h:mm a')
                  : '',
              })}
              status="info"
            />
          )}
          {showVersionDiffContactWarning && (
            <CustomMessageBox
              description={t('energySavingsApplication.show.versionDiffContactWarning')}
              status="warning"
            />
          )}

          <Box bg="greys.grey03" p={3} borderRadius="sm">
            <Text fontStyle="italic">
              {t('site.foippaWarning')}
              <Link href={'mailto:' + t('site.contactEmail')} isExternal>
                {t('site.contactEmail')}
              </Link>
            </Text>
          </Box>
          <Form
            key={permitApplication.formFormatKey}
            form={processedFormJson}
            formReady={formReady}
            submission={unsavedSubmissionData}
            onSubmit={onFormSubmit}
            options={permitAppOptions}
            onBlur={onBlur}
            onChange={(changedEvent) => {
              // Handle address field changes
              if (changedEvent?.changed?.component?.key?.includes('address')) {
                const addressValue = changedEvent?.changed?.value;
                if (!currentUser?.physicalAddress) {
                  permitApplication.setName(addressValue);
                }
              }
              // Call the original onChange function
              onChange(changedEvent);
            }}
            onInitialized={onInitialized}
          />
        </Flex>

        <BuilderBottomFloatingButtons
          isCollapsedAll={isCollapsedAll}
          setIsCollapsedAll={setIsCollapsedAll}
          renderSaveButton={!isSubmitted ? renderSaveButton : null}
        />
        {isOpen && (
          <PermitApplicationSubmitModal
            permitApplication={permitApplication}
            isOpen={isOpen}
            onClose={onClose}
            onSubmit={onModalSubmit}
          />
        )}
        {isContactsOpen && (
          <ContactModal
            isOpen={isContactsOpen}
            onOpen={onContactsOpen}
            onClose={onContactsClose}
            autofillContactKey={autofillContactKey}
            permitApplication={permitApplication}
            submissionState={unsavedSubmissionData}
            setSubmissionState={handleSetUnsavedSubmissionData}
          />
        )}

        {isPreviousSubmissionOpen && (
          <PreviousSubmissionModal
            isOpen={isPreviousSubmissionOpen}
            onOpen={onPreviousSubmissionOpen}
            onClose={onPreviousSubmissionClose}
            requirementJson={singleRequirementFormJson(
              getRequirementByKey(pastVersion.formJson, previousSubmissionKey),
            )}
            submissionJson={singleRequirementSubmissionData(pastVersion.submissionData, previousSubmissionKey)}
          />
        )}
      </>
    );
  },
);

function isFirstComponentNearTopOfView(firstComponentKey) {
  const firstComponentElement = document.querySelector(`.formio-component-${firstComponentKey}`);
  if (firstComponentElement) {
    const firstComponentElTopY = firstComponentElement.getBoundingClientRect().y;
    const buffer = 400; // this buffer is to account for the transition-delay of displaying ErrorBox
    return firstComponentElTopY < buffer;
  } else {
    return false;
  }
}
