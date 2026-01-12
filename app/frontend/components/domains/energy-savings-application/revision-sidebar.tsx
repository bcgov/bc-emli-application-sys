import {
  Box,
  Button,
  Center,
  Flex,
  Hide,
  ListItem,
  OrderedList,
  Portal,
  Spacer,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  useDisclosure,
} from '@chakra-ui/react';
import { CaretRight, ChatDots, PaperPlaneTilt } from '@phosphor-icons/react';
import { format } from 'date-fns';
import { observer } from 'mobx-react-lite';
import React, { MutableRefObject, useEffect, useMemo, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useMountStatus } from '../../../hooks/use-mount-status';
import { useMst } from '../../../setup/root';
import { IEnergySavingsApplication } from '../../../models/energy-savings-application';
import { IRevisionRequestsAttributes } from '../../../types/api-request';
import { IFormIORequirement, IRevisionRequest, ISubmissionVersion } from '../../../types/types';
import { getRequirementByKey } from '../../../utils/formio-component-traversal';
import { getSinglePreviousSubmissionJson } from '../../../utils/formio-submission-traversal';
import { handleScrollToBottom } from '../../../utils/utility-functions';
import { ScrollLink } from '../../shared/energy-savings-applications/scroll-link';
import ConfirmationModal from '../../shared/modals/confirmation-modal';
import { RevisionModal } from '../../shared/revisions/revision-modal';
import SubmissionVersionSelect from '../../shared/select/selectors/submission-version-select';
import { formatFieldValue } from '../../../utils/field-value-formatter';
import { EFlashMessageStatus } from '../../../types/enums';
import { GlobalConfirmationModal } from '../../shared/modals/global-confirmation-modal';

interface IRevisionSideBarProps {
  permitApplication: IEnergySavingsApplication;
  onCancel?: () => void;
  sendRevisionContainerRef?: MutableRefObject<HTMLDivElement>;
  forSubmitter?: boolean;
  updatePerformedBy?: string;
  showRevisionRequestRemove? : boolean
}

export interface IRevisionRequestForm {
  revisionRequestsAttributes: IRevisionRequestsAttributes[];
}

export const RevisionSideBar = observer(
  ({
    permitApplication,
    onCancel,
    sendRevisionContainerRef,
    forSubmitter,
    updatePerformedBy,
    showRevisionRequestRemove = true

  }: IRevisionSideBarProps) => {
    const { t } = useTranslation();
    const isMounted = useMountStatus();
    const [isCancelModalOpen, setCancelModalOpen] = useState(false);
    const [requirementForRevision, setRequirementForRevision] = useState<IFormIORequirement>();
    const [submissionJsonForRevision, setSubmissionJsonForRevision] = useState<any>();
    const [revisionRequest, setRevisionRequest] = useState<IRevisionRequest>();
    const [revisionRequestDefault, setRevisionRequestDefault] = useState<IRevisionRequest>();
    const [isSubmitted, setIsSubmitted] = useState(false);
    const {
      selectedPastSubmissionVersion,
      setSelectedPastSubmissionVersion,
      isViewingPastRequests,
      setIsViewingPastRequests,
    } = permitApplication;

    const [tabIndex, setTabIndex] = useState(0);
    const handleSetTabIndex = (index: number) => {
      setTabIndex(index);
      setIsViewingPastRequests(index === 1);
    };

    const inNewRequest = tabIndex === 0;
    const navigate = useNavigate();

    const getDefaultRevisionRequestValues = () => ({
      revisionRequestsAttributes: permitApplication.latestRevisionRequests as IRevisionRequestsAttributes[],
    });

    const revisionFormMethods = useForm<IRevisionRequestForm>({
      defaultValues: getDefaultRevisionRequestValues(),
    });

    const { handleSubmit, control, reset } = revisionFormMethods;

    const useFieldArrayMethods = useFieldArray({
      control,
      name: 'revisionRequestsAttributes',
      keyName: 'fieldId',
    });

    const { fields } = useFieldArrayMethods;

    useEffect(() => {
      reset(getDefaultRevisionRequestValues());
    }, [permitApplication?.latestRevisionRequests?.length]);

    const onSaveRevision = (formData: IRevisionRequestForm) => {
      setTabIndex(0);
      formData.revisionRequestsAttributes = formData.revisionRequestsAttributes.map((attribute) => ({
        ...attribute,
        performedBy: updatePerformedBy,
      }));
      permitApplication.updateRevisionRequests(formData);
    };

    const [topHeight, setTopHeight] = useState<number>();

    useEffect(() => {
      const updateTopHeight = () => {
        const permitHeaderHeight = document.getElementById('permitHeader')?.offsetHeight;
        setTopHeight(permitHeaderHeight);
      };

      // Call the function to set the initial value
      updateTopHeight();

      // Add event listener for window resize
      window.addEventListener('resize', updateTopHeight);

      // Clean up the event listener on component unmount
      return () => {
        window.removeEventListener('resize', updateTopHeight);
      };
    }, [isMounted]);

    const { isOpen, onOpen, onClose } = useDisclosure();
    const { isOpen: submitIsOpen, onOpen: submitOnOpen, onClose: submitOnClose } = useDisclosure();
    const { isOpen: cancelIsOpen, onOpen: cancelOnOpen, onClose: cancelOnClose } = useDisclosure();

    const onFinalizeRevisions = async () => {
      const ok = await permitApplication.finalizeRevisionRequests();
      if (ok) {
        setIsSubmitted(true);

        // Check pathway to determine next action
        if (updatePerformedBy === 'applicant') {
          // Participant pathway: redirect to submissions inbox
          navigate('/submission-inbox');
        }
        // Staff pathway: stay on screen (no navigation needed)
      }
    };

    const onRevisionsRemoval = async () => {
      const ok = await permitApplication.removeRevisionRequests();

      if (ok) {
        navigate(0);
      }
    };

    const handleOpenRequestRevision = async (event, upToDateFields) => {
      if (!permitApplication.formJson) return;

      const finder = (rr) => rr.requirementJson?.key === event.detail.key;
      const foundRevisionRequestDefault =
        isViewingPastRequests && selectedPastSubmissionVersion?.revisionRequests?.find(finder);
      const foundRevisionRequest = upToDateFields.find(finder);
      const foundRequirement = getRequirementByKey(permitApplication.formJson, event.detail.key);
      const foundSubmissionJson = getSinglePreviousSubmissionJson(permitApplication.submissionData, event.detail.key);

      setRevisionRequest(foundRevisionRequest);
      setRevisionRequestDefault(foundRevisionRequestDefault);
      setRequirementForRevision(foundRequirement);
      setSubmissionJsonForRevision(foundSubmissionJson);
      onOpen();
    };

    useEffect(() => {
      const handleOpenEvent = (event) => handleOpenRequestRevision(event, fields);
      // Listener needs to be re-registered every time the tab index changes
      document.addEventListener('openRequestRevision', handleOpenEvent);
      return () => {
        document.removeEventListener('openRequestRevision', handleOpenEvent);
      };
    }, [fields, tabIndex, selectedPastSubmissionVersion?.id]);

    const handleSelectPastVersionChange = (pastVersion: ISubmissionVersion | null) => {
      if (pastVersion) {
        setSelectedPastSubmissionVersion(pastVersion);
      }
    };

    const renderButtons = () => {
      if (forSubmitter) {
        return (
          <Button rightIcon={<CaretRight />} onClick={handleScrollToBottom} variant="primary">
            {t('energySavingsApplication.edit.submit')}
          </Button>
        );
      }

      return (
        <Flex gap={4}>
          {/* Hide "Send to submitter" button for internal applications and external applications with admin pathway */}
          {permitApplication?.audienceType?.code !== 'internal' &&
            !(permitApplication?.audienceType?.code === 'external' && updatePerformedBy === 'staff') && (
              <>
                <Button
                  variant="primary"
                  rightIcon={<PaperPlaneTilt />}
                  onClick={submitOnOpen}
                  isDisabled={permitApplication.isRevisionsRequested || fields?.length === 0}
                  sx={{
                    _disabled: {
                      bg: 'greys.grey80',
                      color: 'greys.grey05',
                      cursor: 'not-allowed',
                    },
                  }}
                >
                  {t('energySavingsApplication.show.revision.send')}
                </Button>

                <GlobalConfirmationModal
                  isOpen={submitIsOpen}
                  onClose={submitOnClose}
                  onSubmit={() => {
                    onFinalizeRevisions();
                    submitOnClose();
                  }}
                  headerText={t('energySavingsApplication.show.revision.confirmHeader')}
                  bodyText={t('energySavingsApplication.show.revision.confirmMessage')}
                  confirmText={t('ui.confirm')}
                  cancelText={t('ui.cancel')}
                  closeOnOverlayClick={false}
                />
              </>
            )}

          {/* Cancel button triggers remove updates modal */}
          {onCancel && (
            <>
              {fields.length > 0 || permitApplication.isRevisionsRequested ? (
                <>
                  <Button variant="whiteButton" onClick={cancelOnOpen}>
                    {t('ui.cancelRequest')}
                  </Button>

                  <GlobalConfirmationModal
                    isOpen={cancelIsOpen}
                    onClose={cancelOnClose}
                    onSubmit={() => {
                      onRevisionsRemoval();
                      cancelOnClose();
                    }}
                    headerText={t('energySavingsApplication.show.revision.cancelRequest')}
                    bodyText={t('energySavingsApplication.show.revision.noNotification')}
                    confirmText={t('ui.confirm')}
                    cancelText={t('ui.cancel')}
                    closeOnOverlayClick={false}
                  />
                </>
              ) : (
                <Button
                  variant="whiteButton"
                  onClick={() => {
                    onCancel ? onCancel() : permitApplication.setRevisionMode(false);
                  }}
                >
                  {t('ui.cancel')}
                </Button>
              )}
            </>
          )}
        </Flex>
      );
    };

    const selectedTabStyles = {
      borderLeft: '1px Solid',
      borderRight: '1px Solid',
      borderTop: '4px solid',
      borderColor: 'border.dark',
      borderLeftColor: 'border.dark',
      borderTopColor: 'theme.blueAlt',
      borderBottomColor: 'theme.yellowLight',
      borderRadius: 0,
    };

    const sortedPastRevisionRequests = useMemo(() => {
      return Array.from((selectedPastSubmissionVersion?.revisionRequests as IRevisionRequest[]) ?? []).sort((a, b) => {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
    }, [selectedPastSubmissionVersion?.revisionRequests]);

    return (
      <>
        <Hide below="md">
          <Flex
            as={Tabs}
            direction="column"
            boxShadow="md"
            borderRight="1px solid"
            borderRightColor="border.light"
            width={'sidebar.width'}
            position="sticky"
            top={topHeight}
            bottom="0"
            height={`calc(100vh - ${topHeight}px)`}
            float="left"
            id="permit-revision-sidebar"
            bg="theme.yellowLight"
            index={tabIndex}
            // @ts-ignore
            onChange={(index: number) => handleSetTabIndex(index)}
          >
            <TabList borderBottom="1px solid" borderColor="border.dark" mt={4}>
              <Tab ml={4} _selected={selectedTabStyles}>
                {updatePerformedBy === 'staff'
                  ? t('energySavingsApplication.show.revision.newUpdate')
                  : t('energySavingsApplication.show.revision.newRevision')}
              </Tab>
              <Tab ml={4} _selected={selectedTabStyles}>
                {t('energySavingsApplication.show.revision.pastRequests')}
              </Tab>
            </TabList>
            <TabPanels as={Flex} direction="column" flex={1} overflowY="auto">
              <TabPanel flex={1}>
                <Box flex={1}>
                  <Center p={4} textAlign="center" borderBottom="1px solid" borderColor="border.light">
                    <Text fontStyle="italic">
                      {forSubmitter
                        ? t('energySavingsApplication.show.locateRevisions')
                        : updatePerformedBy === 'staff'
                          ? t('energySavingsApplication.show.clickQuestionUpdate')
                          : t('energySavingsApplication.show.clickQuestion')}
                    </Text>
                  </Center>
                  <OrderedList pb={50} mt={4} ml={0}>
                    {fields
                      .filter((field) => !field._destroy)
                      .map((field) => {
                        return <RevisionRequestListItem revisionRequest={field} key={field.id} />;
                      })}
                  </OrderedList>
                </Box>
              </TabPanel>
              <TabPanel>
                <SubmissionVersionSelect
                  options={permitApplication.pastSubmissionVersionOptions}
                  onChange={handleSelectPastVersionChange}
                  value={selectedPastSubmissionVersion}
                />
                <OrderedList mt={4} ml={0}>
                  {sortedPastRevisionRequests.map((rr) => (
                    <RevisionRequestListItem revisionRequest={rr} key={rr.id} />
                  ))}
                </OrderedList>
              </TabPanel>
            </TabPanels>
            {inNewRequest && (
              <Flex
                direction="column"
                border="1px solid"
                borderColor="border.light"
                p={8}
                width={'sidebar.width'}
                gap={4}
                justify="center"
                position="sticky"
                bottom={0}
                left={0}
                maxH={145}
                bg="theme.yellowLight"
                flex={1}
              >
                <Box>
                  <Text as="span" fontWeight="bold">
                    {fields.length}
                  </Text>{' '}
                  <Text as="span" color="text.secondary">
                    {t('ui.selected')}
                  </Text>
                </Box>
                {showRevisionRequestRemove ? renderButtons() : null}
              </Flex>
            )}
          </Flex>
        </Hide>

        {isOpen && (
          <RevisionModal
            isOpen={isOpen}
            onOpen={onOpen}
            onClose={onClose}
            requirementJson={requirementForRevision}
            submissionJson={submissionJsonForRevision}
            useFieldArrayMethods={useFieldArrayMethods}
            revisionRequest={revisionRequest}
            revisionRequestDefault={revisionRequestDefault}
            onSave={handleSubmit(onSaveRevision)}
            isRevisionsRequested={permitApplication.isRevisionsRequested}
            disableInput={forSubmitter || isViewingPastRequests}
            updatePerformedBy={updatePerformedBy}
            permitApplication={permitApplication}
          />
        )}
        {sendRevisionContainerRef && tabIndex == 0 && showRevisionRequestRemove &&  (
          <Portal containerRef={sendRevisionContainerRef}>
            <Flex gap={4} align="center">
              <Box>
                <Text as="span" fontWeight="bold">
                  {fields.length}
                </Text>{' '}
                <Text as="span" color="text.secondary">
                  {t('ui.selected')}
                </Text>
              </Box>
              {renderButtons()}
            </Flex>
          </Portal>
        )}
      </>
    );
  },
);

interface IRevisionRequestListItemProps {
  revisionRequest: Partial<IRevisionRequest>;
}

const RevisionRequestListItem = ({ revisionRequest }: IRevisionRequestListItemProps) => {
  const { t } = useTranslation();
  const { siteConfigurationStore } = useMst();

  const { requirementJson, reasonCode, comment, user, createdAt, submissionJson } = revisionRequest;

  const reasonDescription =
    siteConfigurationStore.revisionReasonOptions.find((option) => option.value === reasonCode)?.label || reasonCode;

  const clickHandleView = () => {
    document.dispatchEvent(new CustomEvent('openRequestRevision', { detail: { key: requirementJson.key } }));
  };

  return (
    <ListItem mb={4} w="full">
      <ScrollLink to={`formio-component-${requirementJson.key}`}>{requirementJson.label}</ScrollLink>
      <Flex fontStyle="italic">
        {t('energySavingsApplication.show.revision.reason')}: {reasonDescription}
      </Flex>
      <Flex gap={2} fontStyle="italic" alignItems="center" flexWrap="nowrap" w="full">
        <Box width={6} height={6}>
          <ChatDots size={24} />
        </Box>
        <Text noOfLines={1}>{comment}</Text>
        <Spacer />
        <Button variant="link" onClick={clickHandleView}>
          {t('ui.view')}
        </Button>
      </Flex>
      {/* Original answer display */}
      <Box mt={1} fontStyle="italic">
        <Text>
          {t('energySavingsApplication.show.revision.originalAnswer')}:&nbsp;
          {(() => {
            const fieldKey = requirementJson?.key;
            const reqSubmission = submissionJson as any;

            if (typeof reqSubmission === 'string') {
              return reqSubmission;
            }

            if (reqSubmission?.data && fieldKey) {
              const fieldValue = reqSubmission.data[fieldKey];
              return formatFieldValue(fieldValue, t);
            }

            return t('energySavingsApplication.show.revision.noOriginalAnswer');
          })()}
        </Text>
      </Box>
      {user && (
        <Text fontStyle={'italic'}>
          {t('ui.editedBy')}: {user.firstName} {user.lastName}
        </Text>
      )}
      {createdAt && (
        <Text fontStyle={'italic'}>
          {/* Using YYYY-MM-DD */}
          {t('ui.dateEdited')}: {format(new Date(createdAt), 'yyyy-MM-dd')}
        </Text>
      )}
    </ListItem>
  );
};
