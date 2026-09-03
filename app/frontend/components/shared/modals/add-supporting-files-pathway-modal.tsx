import {
  Button,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Text,
} from '@chakra-ui/react';
import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useMst } from '../../../setup/root';
import { EPermitClassificationCode, EUpdateRoles, EUserRoles } from '../../../types/enums';

const AddSupportingFilesPathwayModal = ({ isOpen, onClose, permitApplication, onRequestFiles }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { userStore, permitApplicationStore } = useMst();
  const currentUser = userStore.currentUser;
  const isAdminUser = currentUser?.role === EUserRoles.admin || currentUser?.role === EUserRoles.adminManager;

  const [selectedOption, setSelectedOption] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const isApplicantPathway = selectedOption === EUpdateRoles.applicant;

  // Reset state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setSelectedOption(null);
    }
  }, [isOpen]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;
    setSelectedOption(selectedValue);
  };

  const handleNext = async () => {
    if (!selectedOption) return;

    // Applicant pathway: hand off to the Request supporting files modal, which collects the file
    // list that becomes the bullet points in the participant's email. Creating the support request
    // here instead posted an empty note, so the participant was emailed a request listing no files
    // (BCHEP-496).
    if (isApplicantPathway) {
      onClose();
      onRequestFiles?.();
      return;
    }

    setIsLoading(true);

    try {
      // Create the support request with linked application
      // For staff pathway, use 'internal' audience type; otherwise use default 'external'
      // Only the staff route reaches here; the applicant route returned above. The admin uploads
      // the files themselves, so there is no list to send.
      const params = {
        note: '',
        ...(selectedOption === EUpdateRoles.staff && { audience_type_code: 'internal' }),
      };
      const response = await permitApplicationStore.requestSupportingFiles(permitApplication.id, params);

      // requestSupportingFiles resolves false on a non-2xx rather than throwing, so closing
      // unconditionally told the admin the upload form had been created when it had not. The API
      // layer surfaces the error; leave the modal open so they can retry (BCHEP-496).
      if (!response || !(response.supportRequests?.length > 0)) {
        return;
      }

      // Pick by createdAt, not array position: the support_requests association has no order
      // clause (permit_application.rb:181), so on an application with several requests the last
      // element can be an older one and the admin lands on the wrong upload form. Same reduce the
      // model already uses for latestSupportRequestDate.
      const latestSupportRequest = response.supportRequests.reduce((acc, sr) =>
        new Date(sr.createdAt) > new Date(acc.createdAt) ? sr : acc,
      );
      const linkedAppId = latestSupportRequest.linkedApplication?.id;

      if (linkedAppId) {
        // Admin pathway: navigate to the supporting files upload form. Only the staff route
        // reaches here, so there is no applicant branch to handle.
        navigate(`/applications/${linkedAppId}/edit`);
      }

      onClose();
    } catch (error) {
      console.error('Error creating support request:', error);
      // TODO: Show error toast/notification to user
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader color="blue.700">
          {t('energySavingsApplication.show.supportingFilesRequest.addSupportingFiles')}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Text mb={2}>{t('energySavingsApplication.show.supportingFilesRequest.selectionAction')}</Text>
          <Select placeholder={t('ui.pleaseSelect')} onChange={handleSelectChange} value={selectedOption || ''}>
            {isAdminUser ? (
              <>
                <option value={EUpdateRoles.applicant}>
                  <Trans
                    i18nKey="energySavingsApplication.show.updatePathwayOptions.participantOption"
                    values={{
                      userGroup:
                        (permitApplication?.userGroupType.code || EPermitClassificationCode.participant)
                          .charAt(0)
                          .toUpperCase() +
                        (permitApplication?.userGroupType.code || EPermitClassificationCode.participant).slice(1),
                    }}
                  />
                </option>
                <option value={EUpdateRoles.staff}>
                  <Trans
                    i18nKey="energySavingsApplication.show.updatePathwayOptions.adminOption"
                    values={{
                      userGroup: permitApplication?.userGroupType.code || EPermitClassificationCode.participant,
                    }}
                  />
                </option>
              </>
            ) : (
              Object.entries(EUpdateRoles).map(([key, value]) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))
            )}
          </Select>
        </ModalBody>

        <ModalFooter>
          <Button variant="primary" mr={3} onClick={handleNext} isDisabled={!selectedOption} isLoading={isLoading}>
            {t('ui.next')}
          </Button>
          <Button variant="outline" onClick={onClose} isDisabled={isLoading}>
            {t('ui.back')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default AddSupportingFilesPathwayModal;
