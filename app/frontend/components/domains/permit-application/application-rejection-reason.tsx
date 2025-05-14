import React, { useEffect, useState } from 'react';
import { Box, Button, Flex, Icon, Text, Textarea, VStack } from '@chakra-ui/react';
import { WarningCircle } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';

import { observer } from 'mobx-react-lite';
import { useMst } from '../../../setup/root';
import { EPermitApplicationStatus } from '../../../types/enums';
import { usePermitApplication } from '../../../hooks/resources/use-permit-application';

const RejectApplicationScreen = observer(() => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();

  const [comment, setComment] = useState('');
  const { currentPermitApplication, error } = usePermitApplication();

  const handleReject = async () => {
    if (!currentPermitApplication) return;

    const response = await currentPermitApplication.updateStatus({
      status: EPermitApplicationStatus.ineligible,
      status_update_reason: comment,
    });
    if (!response.ok) {
      return;
    }
    navigate(`/applications/${response?.data?.data?.id}/successful-submission`, {
      state: {
        message: t('energySavingsApplication.new.markedIneligible'),
      },
    });
  };

  return (
    <VStack spacing={6} p={8} bg="white">
      <VStack spacing={4} align="center" textAlign="center">
        <Icon as={WarningCircle} boxSize={10} color="orange.400" />
        <Text fontSize="2xl" fontWeight="bold" color="theme.blueAlt">
          {t('energySavingsApplication.show.inEligibleDetails')}
        </Text>
        <Box
          border="1px"
          borderColor="theme.darkBlue"
          borderRadius="sm"
          px={3}
          py={1}
          fontSize="sm"
          color="theme.blueText"
        >
          {t('energySavingsApplication.show.applicationId')} {id}
        </Box>
        <Box w="100%" mt={4} textAlign="left">
          <Text mb={1} fontSize="sm" color="gray.700">
            {t('energySavingsApplication.show.inEligibleReason')}
          </Text>
          <Textarea mt={2} rows={4} w="full" value={comment} onChange={(e) => setComment(e.target.value)} />
        </Box>
        <Flex w="100%" justify="center" gap={4} mt={8}>
          <Button variant="primary" px={8} onClick={handleReject} isDisabled={!comment}>
            {t('ui.confirm')}
          </Button>
          <Button variant="outline" px={8} onClick={() => navigate(-1)}>
            {t('ui.cancel')}
          </Button>
        </Flex>
      </VStack>
    </VStack>
  );
});

export default RejectApplicationScreen;
