import { Box, Flex } from '@chakra-ui/react';
import { Warning } from '@phosphor-icons/react';
import { format } from 'date-fns';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

interface IContractorSuspendedBannerProps {
  suspendedAt: Date;
}

// BCHEP-531: admin/review-staff banner shown above the form status flow on a suspended
// contractor's onboarding (application edit) page. Matches the width of the status-flow box
// because it is rendered in the same container via RequirementForm's renderTopButtons.
// The "view suspension reasons" action lives in the page header, not in this banner.
export const ContractorSuspendedBanner = observer(function ContractorSuspendedBanner({
  suspendedAt,
}: IContractorSuspendedBannerProps) {
  const { t } = useTranslation();

  // Matches the app-wide date/time format (e.g. the status-flow timeline): "Mar 2, 2026 4:03 PM"
  const formattedDate = format(suspendedAt, 'MMM d, yyyy h:mm a');

  return (
    <Box
      bg="theme.orangeLight02"
      border="1px solid"
      borderColor="theme.orange"
      borderRadius="lg"
      py={3}
      px={4}
      w="full"
    >
      <Flex direction="row" align="center" gap={2} w="full">
        <Warning size={20} weight="fill" color="var(--chakra-colors-theme-orange)" style={{ flexShrink: 0 }} />
        <Box fontFamily="BC Sans" fontWeight="400" fontSize="16px" lineHeight="27px" color="greys.anotherGrey">
          {t('contractor.suspended.onboardingBanner.title', { date: formattedDate })}
        </Box>
      </Flex>
    </Box>
  );
});
