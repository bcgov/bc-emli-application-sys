import React, { useState } from 'react';
import { Box, Button, Flex, Icon, Text, Textarea, VStack } from '@chakra-ui/react';
import { WarningCircleIcon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { observer } from 'mobx-react-lite';
import { EPermitApplicationStatus } from '../../../types/enums';
import { usePermitApplication } from '../../../hooks/resources/use-permit-application';

export const RejectApplicationScreen = observer(() => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [comment, setComment] = useState('');
  const { currentPermitApplication } = usePermitApplication({ review: true });

  const handleReject = async () => {
    if (!currentPermitApplication) return;

    const response = await currentPermitApplication.updateStatus({
      status: EPermitApplicationStatus.ineligible,
      status_update_reason: comment,
    });
    if (!response.ok) {
      return;
    }
    navigate(`/applications/${response?.data?.data?.id}/ineligible-success`, {
      state: {
        referenceNumber: currentPermitApplication?.number,
        submissionType: currentPermitApplication?.submissionType?.code,
      },
    });
  };

  return (
    <VStack spacing={6} p={8} bg="white">
      <VStack spacing={4} align="center" textAlign="center">
        <Icon as={WarningCircleIcon} boxSize={10} color="orange.400" />
        <Text fontSize="2xl" fontWeight="bold" color="theme.blueAlt">
          {t('energySavingsApplication.show.inEligibleDetails', {
            submissionType: currentPermitApplication?.submissionType.name.toLowerCase(),
          })}
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
          {t('energySavingsApplication.referenceNumber')} {currentPermitApplication?.number}
        </Box>
        <Box w="100%" mt={4} textAlign="left">
          <Text mb={1} fontSize="sm" color="gray.700">
            {t('energySavingsApplication.show.inEligibleReason', {
              submissionType: currentPermitApplication?.submissionType.name.toLowerCase(),
            })}
          </Text>
          <Textarea mt={2} rows={4} w="full" value={comment} onChange={(e) => setComment(e.target.value)} />
        </Box>
        <Flex w="100%" justify="center" gap={4} mt={8}>
          <Button width={'10rem'} variant="primary" px={8} onClick={handleReject} isDisabled={!comment}>
            {t('ui.confirm')}
          </Button>
          <Button width={'10rem'} variant="outline" px={8} onClick={() => navigate(-1)}>
            {t('ui.cancel')}
          </Button>
        </Flex>
      </VStack>
    </VStack>
  );
});
