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

export const SuspendReasonPage = observer(function SuspendReasonPage() {
  const { t } = useTranslation();
  const { contractorId } = useParams<{ contractorId: string }>();
  const { contractorStore } = useMst();
  const navigate = useNavigate();
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const contractor = contractorStore.contractorsMap.get(contractorId!);

  const handleConfirm = async () => {
    if (!reason.trim()) {
      setError(t('contractor.suspend.reason.required', 'Reason is required'));
      return;
    }

    setError('');
    setIsSubmitting(true);
    const response = await contractorStore.suspendContractor(contractorId!, reason);

    if (response.ok) {
      navigate(`/contractor-management/${contractorId}/suspend/confirmation`);
    } else {
      setError(t('contractor.suspend.reason.error', 'Failed to suspend contractor'));
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
            {t('contractor.suspend.reason.title', 'Reason for suspension')}
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
          {t('contractor.suspend.reason.contractorLabel', 'Contractor')} #{contractor?.number}
        </Box>

        {/* Form */}
        <FormControl isInvalid={!!error} w="500px">
          <FormLabel htmlFor="suspension-reason" color="greys.anotherGrey" py={1}>
            {t('contractor.suspend.reason.label', 'Reason this contractor is suspended')}
          </FormLabel>
          <Textarea
            id="suspension-reason"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError('');
            }}
            placeholder={t('contractor.suspend.reason.placeholder', 'Enter suspension reason...')}
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
            {t('contractor.suspend.reason.confirm', 'Confirm')}
          </Button>
          <Button variant="secondary" minW="155px" onClick={handleCancel} isDisabled={isSubmitting}>
            {t('contractor.suspend.reason.cancel', 'Cancel')}
          </Button>
        </HStack>
      </VStack>
    </Container>
  );
});
