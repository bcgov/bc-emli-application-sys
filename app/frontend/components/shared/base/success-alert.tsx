import { Alert, AlertTitle, Box, Button, Stack } from '@chakra-ui/react';
import { CheckCircle } from '@phosphor-icons/react';
import React from 'react';
import { useTranslation } from 'react-i18next';

function SuccessAlert() {
  const { t } = useTranslation();

  const handleReload = () => {
    window.location.href = '/login?showContractor=false';
  };
  return (
    <Stack
      p={4}
      mt={4}
      bg="semantic.successLight"
      border="1px"
      borderColor="success"
      borderRadius="lg"
      width="100%"
      align="stretch"
    >
      {/* overflow visible: Alert defaults to hidden, which clips the focus ring of
          controls sitting flush with its bottom edge. */}
      <Alert status="success" variant="subtle" bg="transparent" alignItems="start" p={0} overflow="visible">
        {/* Decorative status icon: not interactive, and the alert text already conveys
            the state, so it must be neither focusable nor announced. */}
        <Box aria-hidden="true" zIndex={1} flexShrink={0} mr={2}>
          <CheckCircle size={26} color="green" />
        </Box>
        <Stack>
          <AlertTitle fontSize="md" fontWeight="bold">
            {t('auth.checkEligibility.alert.eligible')}
          </AlertTitle>
          <Button size="sm" variant="secondary" onClick={handleReload}>
            {t('auth.checkEligibility.alert.loginWithAccount')}
          </Button>
        </Stack>
      </Alert>
    </Stack>
  );
}

export default SuccessAlert;
