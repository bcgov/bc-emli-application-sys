import React, { useEffect, useRef } from 'react';
import { Box, Button, Container, Heading, VStack, Icon, VisuallyHidden } from '@chakra-ui/react';
import { CheckCircle } from '@phosphor-icons/react';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useMst } from '../../../setup/root';

export const UnsuspendConfirmedPage = observer(function UnsuspendConfirmedPage() {
  const { t } = useTranslation();
  const { contractorId } = useParams<{ contractorId: string }>();
  const { contractorStore } = useMst();
  const navigate = useNavigate();
  const headingRef = useRef<HTMLHeadingElement>(null);

  const contractor = contractorStore.contractorsMap.get(contractorId!);

  useEffect(() => {
    if (contractorId && !contractor) {
      contractorStore.fetchContractor(contractorId);
    }
  }, [contractorId, contractor, contractorStore]);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const handleBackToManage = async () => {
    contractorStore.setStatusFilter('active');
    await contractorStore.search();
    navigate('/contractor-management');
  };

  return (
    <Container maxW="900px" py={20} pb={10} as="main">
      <VStack align="center" spacing={8} w="full" role="region" aria-live="polite">
        <VisuallyHidden>Success: Contractor has been unsuspended</VisuallyHidden>

        <VStack spacing={2}>
          <Icon as={CheckCircle} boxSize="56px" color="theme.green" aria-hidden="true" />
          <Heading ref={headingRef} as="h1" fontSize="32px" textAlign="center" color="theme.blueAlt" tabIndex={-1}>
            {t('contractor.unsuspend.confirmed.title', 'Contractor unsuspended')}
          </Heading>
        </VStack>

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
          {t('contractor.suspend.confirmed.contractorLabel', 'Contractor')} #{contractor?.number}
        </Box>

        <Button variant="primary" minW="281px" onClick={handleBackToManage}>
          {t('contractor.suspend.confirmed.backButton', 'Back to Manage contractor details')}
        </Button>
      </VStack>
    </Container>
  );
});
