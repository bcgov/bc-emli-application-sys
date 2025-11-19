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
import CollectionConsentModal from './consent-modal';
import { EUpdateRoles, EUserRoles, EPermitClassificationCode } from '../../../types/enums';
import { useMst } from '../../../setup/root';

const UpdatePathwayModal = ({ isOpen, onClose, setRevisionMode, setPerformedBy, permitApplication }) => {
  const { t } = useTranslation();
  const { userStore } = useMst();
  const currentUser = userStore.currentUser;
  const isAdminUser = currentUser?.role === EUserRoles.admin || currentUser?.role === EUserRoles.adminManager;

  const [selectedOption, setSelectedOption] = useState(null);
  const [isCollectionConsentModalOpen, setCollectionConsentModalOpen] = useState(false);

  // Proper implementation: use audience type to detect internal applications
  const isInternalApplication = permitApplication?.audienceType?.code === EPermitClassificationCode.internal;

  // Reset state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setSelectedOption(null);
    }
  }, [isOpen]);

  // For internal applications, skip the pathway modal and go straight to consent
  React.useEffect(() => {
    if (isOpen && isInternalApplication && isAdminUser) {
      setPerformedBy(EUpdateRoles.staff);
      setCollectionConsentModalOpen(true);
    }
  }, [isOpen, isInternalApplication, isAdminUser, setPerformedBy]);

  const handleSelectChange = (e) => {
    const selectedValue = e.target.value;
    setSelectedOption(selectedValue);
    setPerformedBy(selectedValue); // Pass selected value to parent component
  };

  const handleNext = () => {
    setPerformedBy(selectedOption);

    if (selectedOption === EUpdateRoles.staff) {
      // Admin workflow - always uses standard revision request system now
      setCollectionConsentModalOpen(true); // Open CollectionConsentModal
      // Don't set revision mode yet - wait for consent
    } else {
      // Participant workflow (applicant selected)
      setRevisionMode(true);
      onClose();
    }
  };

  const onCollectionConsentModalClose = (confirmed = false) => {
    setCollectionConsentModalOpen(false);
    // Always close the parent modal regardless of confirmation
    onClose();
  };

  return (
    <>
      {/* For internal applications, skip the pathway modal entirely */}
      {!isInternalApplication && (
        <Modal isOpen={isOpen} onClose={onClose} isCentered>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader color="blue.700">{t('energySavingsApplication.show.updatePathway')}</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <Text mb={2}>{t('energySavingsApplication.show.performedBy')}</Text>
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
              <Button variant="primary" mr={3} onClick={handleNext} isDisabled={!selectedOption}>
                {t('ui.next')}
              </Button>
              <Button variant="outline" onClick={onClose}>
                {t('ui.back')}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}

      <CollectionConsentModal
        isOpen={isCollectionConsentModalOpen}
        onClose={onCollectionConsentModalClose}
        setRevisionMode={setRevisionMode}
        permitApplication={permitApplication}
      />
    </>
  );
};

export default UpdatePathwayModal;
