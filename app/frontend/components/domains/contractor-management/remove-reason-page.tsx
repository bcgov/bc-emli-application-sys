import React, { useState } from 'react';
import {
  Box,
  Button,
  Container,
  Heading,
  Textarea,
  VStack,
  HStack,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Icon,
} from '@chakra-ui/react';
import { WarningCircle } from '@phosphor-icons/react';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useMst } from '../../../setup/root';
import { GlobalConfirmationModal } from '../../shared/modals/global-confirmation-modal';

export const RemoveReasonPage = observer(function RemoveReasonPage() {
  const { t } = useTranslation();
  const { contractorId } = useParams<{ contractorId: string }>();
  const { contractorStore } = useMst();
  const navigate = useNavigate();
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const contractor = contractorStore.contractorsMap.get(contractorId!);

  const handleConfirm = () => {
    if (!reason.trim()) {
      setError(t('contractor.remove.reason.required', 'Reason is required'));
      return;
    }

    setError('');
    setIsConfirmModalOpen(true);
  };

  const handleFinalConfirm = async () => {
    setIsConfirmModalOpen(false);
    setIsSubmitting(true);
    const response = await contractorStore.deactivateContractor(contractorId!, reason);

    if (response.ok) {
      navigate(`/contractor-management/${contractorId}/remove/removal-confirmation`);
    } else {
      setError(t('contractor.remove.reason.error', 'Failed to remove contractor'));
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/contractor-management');
  };

  return (
    <Container maxW="900px" py={20} pb={10} as="main">
      <VStack align="center" spacing={8} w="full">
        {/* Header */}
        <VStack spacing={2}>
          <Icon as={WarningCircle} boxSize="56px" color="theme.orange" aria-hidden="true" />
          <Heading as="h1" fontSize="32px" textAlign="center" color="theme.blueAlt">
            {t('contractor.remove.reason.title', 'Reason for removal')}
          </Heading>
        </VStack>

        {/* Contractor badge */}
        <Box
          px={2}
          py={2}
          bg="greys.offWhite"
          border="1px solid"
          borderColor="theme.blueText"
          borderRadius="4px"
          fontSize="14px"
          color="theme.blueText"
          role="status"
          aria-label={`Contractor number ${contractor?.number}`}
        >
          {t('contractor.remove.reason.contractorLabel', 'Contractor')} #{contractor?.number}
        </Box>

        {/* Form */}
        <FormControl isInvalid={!!error} w="500px">
          <FormLabel htmlFor="removal-reason" color="greys.anotherGrey" py={1}>
            {t('contractor.remove.reason.label', 'Reason this contractor is being removed')}
          </FormLabel>
          <Textarea
            id="removal-reason"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError('');
            }}
            placeholder={t('contractor.remove.reason.placeholder', 'Enter removal reason...')}
            maxLength={5000}
            h="135px"
            resize="none"
          />
          {error && <FormErrorMessage>{error}</FormErrorMessage>}
        </FormControl>

        {/* Buttons */}
        <HStack spacing={8}>
          <Button
            variant="primary"
            minW="155px"
            onClick={handleConfirm}
            isDisabled={isSubmitting}
            isLoading={isSubmitting}
          >
            {t('contractor.remove.reason.confirm', 'Confirm')}
          </Button>
          <Button variant="secondary" minW="155px" onClick={handleCancel} isDisabled={isSubmitting}>
            {t('contractor.remove.reason.cancel', 'Cancel')}
          </Button>
        </HStack>
      </VStack>

      <GlobalConfirmationModal
        headerText={t(
          'contractor.remove.finalConfirm.title',
          "This action can't be reversed, are you sure you want to continue?",
        )}
        bodyText=""
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onSubmit={handleFinalConfirm}
        confirmText={t('contractor.remove.finalConfirm.confirm', 'Confirm')}
        cancelText={t('contractor.remove.finalConfirm.cancel', 'Cancel')}
      />
    </Container>
  );
});
