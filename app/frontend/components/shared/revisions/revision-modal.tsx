import {
  Box,
  Button,
  Divider,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  Heading,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Spacer,
  Text,
  Textarea,
  useDisclosure,
} from '@chakra-ui/react';
import { Trash } from '@phosphor-icons/react';
import React, { useState } from 'react';
import { UseFieldArrayReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useMst } from '../../../setup/root';
import { IFormIORequirement, IRevisionRequest } from '../../../types/types';
import { singleRequirementFormJson } from '../../../utils/formio-helpers';
import { IRevisionRequestForm } from '../../domains/energy-savings-application/revision-sidebar';
import { SingleRequirementForm } from '../energy-savings-applications/single-requirement-form';

export interface IRevisionModalProps extends Partial<ReturnType<typeof useDisclosure>> {
  requirementJson: IFormIORequirement;
  submissionJson: any;
  revisionRequest: IRevisionRequest;
  revisionRequestDefault?: IRevisionRequest;
  useFieldArrayMethods: UseFieldArrayReturn<IRevisionRequestForm, 'revisionRequestsAttributes', 'fieldId'>;
  onSave: () => Promise<void>;
  isRevisionsRequested?: boolean;
  disableInput?: boolean;
  updatePerformedBy?: string;
  permitApplication?: any;
}

export const RevisionModal: React.FC<IRevisionModalProps> = ({
  requirementJson,
  submissionJson,
  isOpen,
  onOpen,
  onClose,
  revisionRequest,
  revisionRequestDefault,
  useFieldArrayMethods,
  onSave,
  isRevisionsRequested,
  disableInput,
  updatePerformedBy,
  permitApplication,
}) => {
  const { t } = useTranslation();
  const [reasonCode, setReasonCode] = useState<string>(
    revisionRequestDefault?.reasonCode ?? revisionRequest?.reasonCode ?? '',
  );
  const [comment, setComment] = useState<string>(revisionRequestDefault?.comment ?? revisionRequest?.comment ?? '');

  const { update, append, fields } = useFieldArrayMethods;

  const { userStore, siteConfigurationStore } = useMst();
  const { currentUser } = userStore;

  const { revisionReasonOptions } = siteConfigurationStore;

  const className = `formio-component-${requirementJson?.key}`;
  const elements = document.getElementsByClassName(className);

  const resetFields = () => {
    setReasonCode('');
    setComment('');
  };

  const handleClose = () => {
    resetFields();
    onClose();
  };
  const index = fields.findIndex((field) => field.id === revisionRequest?.id);

  const handleUpsert = () => {
    if (!reasonCode || !requirementJson) return;

    const newItem = {
      id: revisionRequest?.id,
      userId: currentUser.id,
      reasonCode,
      requirementJson,
      submissionJson,
      comment,
    };
    if (revisionRequest) {
      // Item exists, replace it
      update(index, newItem);
    } else {
      // Item does not exist, append it
      append(newItem);
    }

    // For admin updates, need to save locally to trigger form updates and Save Edits button
    // For send to submitter workflow, save immediately to server
    if (updatePerformedBy === 'staff') {
      // Set revision mode to enable field editing for admin workflows
      if (permitApplication) {
        permitApplication.setRevisionMode(true);
      }

      // Call onSave to update local state (latestRevisionRequests) but for admin workflow
      // this won't save to server, just updates the local model
      onSave().then(() => {
        if (elements?.[0]) {
          elements[0].classList.add('revision-requested');
        }
        handleClose();
      });
    } else {
      // Standard revision request workflow - save immediately
      onSave().then(() => {
        elements?.[0]?.classList?.add('revision-requested');
        handleClose();
      });
    }
  };

  const handleDelete = () => {
    if (revisionRequest?.id) {
      update(index, { _destroy: true, id: revisionRequest.id });
    }

    // Standard revision request workflow - save immediately
    onSave().then(() => {
      elements?.[0]?.classList?.remove('revision-requested');
      handleClose();
    });
  };

  const requirementForm = singleRequirementFormJson(
    revisionRequestDefault?.requirementJson ?? revisionRequest?.requirementJson ?? requirementJson,
  );
  const requirementSubmission =
    revisionRequestDefault?.submissionJson ?? revisionRequest?.submissionJson ?? submissionJson;

  const selectedLabel = revisionReasonOptions.find((opt) => opt.value === reasonCode)?.label;

  return (
    <Modal onClose={handleClose} isOpen={isOpen} size="sm">
      <ModalOverlay />

      <ModalContent mt={48} maxW="348px" minH="485px">
        <ModalHeader textAlign="center">
          <ModalCloseButton fontSize="11px" />
          <Heading as="h3" fontSize="xl" color="theme.blueAlt">
            {updatePerformedBy === 'staff'
              ? t('permitApplication.show.revision.updateField')
              : t('energySavingsApplication.show.revision.revisionRequest')}
          </Heading>
        </ModalHeader>
        <ModalBody>
          <Flex direction="column" gap={4}>
            <FormControl>
              <FormLabel>{t('energySavingsApplication.show.revision.reasonFor')}</FormLabel>
              {isRevisionsRequested ? (
                <Textarea disabled={true}>{selectedLabel}</Textarea>
              ) : (
                <Select
                  placeholder={t('ui.pleaseSelect')}
                  value={reasonCode}
                  onChange={(e) => setReasonCode(e.target.value)}
                >
                  {revisionReasonOptions.map((opt) => (
                    <option value={opt.value} key={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              )}
            </FormControl>
            <FormControl>
              <FormLabel>{t('permitApplication.show.revision.comment')}</FormLabel>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t('permitApplication.show.revision.comment')}
                maxLength={350}
                isDisabled={isRevisionsRequested}
                sx={{
                  _disabled: {
                    color: 'text.primary',
                    cursor: 'not-allowed',
                  },
                }}
              />
              {!disableInput && <FormHelperText>{t('permitApplication.show.revision.maxCharacters')}</FormHelperText>}
            </FormControl>

            <Divider />

            {(currentUser?.role === 'admin' || currentUser?.role === 'admin_manager') && (
              <FormControl>
                <FormLabel>{t('energySavingsApplication.show.revision.originalAnswer')}</FormLabel>
                <Box p={3} bg="gray.50" borderRadius="md" border="1px solid" borderColor="gray.200">
                  <Text color="gray.700" fontWeight="normal">
                    {(() => {
                      // Extract the field value from the nested data structure
                      const fieldKey = requirementJson?.key;

                      if (typeof requirementSubmission === 'string') {
                        return requirementSubmission;
                      }

                      if (requirementSubmission?.data && fieldKey) {
                        const fieldValue = requirementSubmission.data[fieldKey];
                        if (fieldValue !== undefined && fieldValue !== null && fieldValue !== '') {
                          return String(fieldValue);
                        }
                      }

                      return t('energySavingsApplication.show.revision.noOriginalAnswer');
                    })()}
                  </Text>
                </Box>
              </FormControl>
            )}
          </Flex>
          <ModalFooter>
            <Flex width="full" justify="center" gap={4}>
              {disableInput ? (
                <>
                  <Button variant="secondary" onClick={onClose}>
                    {t('ui.ok')}
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={handleUpsert} variant="primary" isDisabled={!reasonCode || isRevisionsRequested}>
                    {updatePerformedBy === 'staff'
                      ? t('permitApplication.show.revision.updateField')
                      : t('permitApplication.show.revision.useButton')}
                  </Button>

                  <Button variant="outline" onClick={handleDelete} isDisabled={isRevisionsRequested}>
                    {updatePerformedBy === 'staff' ? t('ui.remove') : t('ui.delete')}
                  </Button>
                </>
              )}
            </Flex>
          </ModalFooter>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};
