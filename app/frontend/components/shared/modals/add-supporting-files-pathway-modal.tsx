import React, { useState } from 'react';
import {
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Select,
  Text,
} from '@chakra-ui/react';
import { useTranslation, Trans } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { EUpdateRoles, EUserRoles, EPermitClassificationCode } from '../../../types/enums';
import { useMst } from '../../../setup/root';

const AddSupportingFilesPathwayModal = ({ isOpen, onClose, permitApplication }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { userStore, permitApplicationStore } = useMst();
  const currentUser = userStore.currentUser;
  const isAdminUser = currentUser?.role === EUserRoles.admin || currentUser?.role === EUserRoles.adminManager;

  const [selectedOption, setSelectedOption] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

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

    setIsLoading(true);

    try {
      // Create the support request with linked application
      // For staff pathway, use 'internal' audience type; otherwise use default 'external'
      const params = {
        note: '',
        ...(selectedOption === EUpdateRoles.staff && { audience_type_code: 'internal' }),
      };
      const response = await permitApplicationStore.requestSupportingFiles(permitApplication.id, params);

      if (response && response.supportRequests?.length > 0) {
        // Get the most recent support request (the one we just created)
        const latestSupportRequest = response.supportRequests[response.supportRequests.length - 1];
        const linkedAppId = latestSupportRequest.linkedApplication?.id;

        if (linkedAppId) {
          if (selectedOption === EUpdateRoles.staff) {
            // Admin pathway: Navigate to the supporting files upload form
            navigate(`/applications/${linkedAppId}/edit`);
          } else {
            // Applicant pathway: Notification sent, stay on current page
            // The participant will receive an email and can access the form
          }
        }
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
