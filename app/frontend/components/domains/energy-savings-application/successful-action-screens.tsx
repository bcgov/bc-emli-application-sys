import { Container, Flex, Heading, Icon, Text, VStack, Box, Button } from '@chakra-ui/react';
import { CheckCircleIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { RouterLinkButton } from '../../shared/navigation/router-link-button';
import { SubmissionReturnButton } from '../../shared/energy-savings-applications/submission-action-return-button';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { useMst } from '../../../setup/root';
import React, { useEffect } from 'react';
import { EUserRoles } from '../../../types/enums';

/***
 * Base Reusable Success Screen
 ***/
type IconType = 'success' | 'warning' | React.ReactNode;

interface SuccessfulActionScreenProps {
  icon?: IconType;
  title: string;
  subtitle?: string;
  referenceNumber?: string;
  referenceLabel?: string;
  primaryButtonLabel: string;
  primaryButtonTo: string;
  onButtonClick?: () => Promise<void> | void;
}

export const SuccessfulActionScreen = ({
  icon = 'success',
  title,
  subtitle,
  referenceNumber,
  referenceLabel,
  primaryButtonLabel,
  primaryButtonTo,
  onButtonClick,
}: SuccessfulActionScreenProps) => {
  const { t } = useTranslation();

  const resolveIcon = () => {
    if (React.isValidElement(icon)) return icon;

    if (icon === 'warning') {
      return <Icon as={WarningCircleIcon} boxSize={12} color="orange.400" />;
    }

    return <Icon as={CheckCircleIcon} boxSize={12} color="green.500" />;
  };

  const displayLabel = referenceLabel ?? t('energySavingsApplication.referenceNumber');

  return (
    <Container maxW="container.lg">
      <Flex direction="column" align="center" my={24} gap={8} role="region" aria-live="polite">
        {resolveIcon()}

        <VStack spacing={4}>
          <Heading as="h2" fontSize="32px" fontWeight="700" color="theme.blueAlt" textAlign="center">
            {title}
          </Heading>

          {subtitle && (
            <Text fontSize="16px" fontWeight="400" color="greys.anotherGrey" textAlign="center">
              {subtitle}
            </Text>
          )}

          {referenceNumber && (
            <Box
              border="1px"
              borderColor="theme.darkBlue"
              borderRadius="sm"
              px={3}
              py={1}
              fontSize="sm"
              color="theme.blueText"
            >
              {displayLabel} {referenceNumber}
            </Box>
          )}
        </VStack>

        {onButtonClick ? (
          <Button
            onClick={onButtonClick}
            bg="theme.darkBlue"
            color="white"
            px={8}
            _hover={{ bg: 'theme.blueButtonHover' }}
          >
            {primaryButtonLabel}
          </Button>
        ) : (
          <RouterLinkButton
            to={primaryButtonTo}
            bg="theme.darkBlue"
            color="white"
            px={8}
            _hover={{ bg: 'theme.blueButtonHover' }}
          >
            {primaryButtonLabel}
          </RouterLinkButton>
        )}
      </Flex>
    </Container>
  );
};

/***
 * Withdrawal Success Screen
 ***/
export const SuccessfulWithdrawalScreen = observer(() => {
  const { t } = useTranslation();
  const location = useLocation();
  const { submissionType } = location.state || {};
  const { userStore } = useMst();
  const currentUser = userStore.currentUser;

  const getReturnPath = () => {
    if (currentUser.isParticipant) return '/applications';
    if (currentUser.isContractor) return '/contractor-dashboard';
    return '/submission-inbox';
  };

  return (
    <SuccessfulActionScreen
      icon="success"
      title={t('energySavingsApplication.withdraw.success.title', {
        submissionType: submissionType?.toLowerCase(),
      })}
      primaryButtonLabel={
        currentUser.isParticipant
          ? t('energySavingsApplication.returnToDashboard')
          : currentUser.isContractor
            ? t('contractor.invoiceSuccess.returnToDashboard')
            : t('energySavingsApplication.new.viewAllSubmissions')
      }
      primaryButtonTo={getReturnPath()}
    />
  );
});

/***
 * Ineligible Success Screen
 ***/
export const SuccessfulIneligibleScreen = observer(() => {
  const { t } = useTranslation();
  const location = useLocation();
  const { submissionType, referenceNumber } = location.state || {};
  const { userStore } = useMst();
  const currentUser = userStore.currentUser;

  const isUserAdmin = [EUserRoles.admin, EUserRoles.adminManager].indexOf(currentUser.role) >= 0;
  return (
    <SuccessfulActionScreen
      icon="warning"
      title={t(
        `${isUserAdmin ? 'energySavingsApplication.review.admin.markedIneligible' : 'energySavingsApplication.review.markedIneligible'}`,
        {
          // 'energySavingsApplication.review.markedIneligible'
          submissionType: submissionType?.toLowerCase(),
        },
      )}
      subtitle={t('energySavingsApplication.review.ineligibleNextSteps')}
      referenceNumber={referenceNumber}
      primaryButtonLabel={
        currentUser.isParticipant
          ? t('energySavingsApplication.returnToMain')
          : t('energySavingsApplication.new.viewAllSubmissions')
      }
      primaryButtonTo={currentUser.isParticipant ? '/applications' : '/submission-inbox'}
    />
  );
});

/***
 * Screened-In (In Review) Success Screen
 ***/
export const SuccessfulScreenedInScreen = observer(() => {
  const { t } = useTranslation();
  const location = useLocation();
  const { submissionType, applicationNumber } = location.state || {};

  const { userStore } = useMst();
  const currentUser = userStore.currentUser;

  return (
    <SuccessfulActionScreen
      icon="success"
      title={t('energySavingsApplication.review.screenedInSuccess', {
        submissionType: submissionType?.toLowerCase(),
      })}
      referenceNumber={applicationNumber}
      primaryButtonLabel={
        currentUser.isParticipant
          ? t('energySavingsApplication.returnToMain')
          : t('energySavingsApplication.new.viewAllSubmissions')
      }
      primaryButtonTo={currentUser.isParticipant ? '/applications' : '/submission-inbox'}
    />
  );
});

/***
 * Updated Application Success Screen
 ***/
export const SuccessfulUpdateScreen = observer(() => {
  const { t } = useTranslation();
  const location = useLocation();
  const { submissionType, applicationNumber } = location.state || {};

  const { userStore } = useMst();
  const currentUser = userStore.currentUser;

  return (
    <SuccessfulActionScreen
      icon="success"
      title={t('energySavingsApplication.show.adminSaveSuccess', {
        submissionType: submissionType?.toLowerCase(),
      })}
      referenceNumber={applicationNumber}
      primaryButtonLabel={
        currentUser.isParticipant
          ? t('energySavingsApplication.returnToMain')
          : t('energySavingsApplication.new.viewAllSubmissions')
      }
      primaryButtonTo={currentUser.isParticipant ? '/applications' : '/submission-inbox'}
    />
  );
});

/***
 * Training Pending Success
 ***/
export const SuccessfulTrainingPendingScreen = observer(() => {
  const { t } = useTranslation();
  const location = useLocation();
  const { submissionType, applicationNumber } = location.state || {};

  const { userStore } = useMst();
  const currentUser = userStore.currentUser;

  return (
    <SuccessfulActionScreen
      icon="success"
      title={t('contractorOnboarding.trainingPending.successTitle', {
        submissionType: submissionType?.toLowerCase(),
      })}
      subtitle={t('contractorOnboarding.trainingPending.successMessage')}
      referenceNumber={applicationNumber}
      primaryButtonLabel={
        currentUser.isParticipant
          ? t('energySavingsApplication.returnToMain')
          : t('energySavingsApplication.new.viewAllSubmissions')
      }
      primaryButtonTo={currentUser.isParticipant ? '/applications' : '/submission-inbox'}
    />
  );
});

/***
 * Shared hook for contractor confirmation screens
 ***/
const useBackToContractorManagement = () => {
  const { contractorStore } = useMst();
  const navigate = useNavigate();

  return async () => {
    contractorStore.setStatusFilter('active');
    await contractorStore.search();
    navigate('/contractor-management');
  };
};

/***
 * Contractor Suspend Confirmation Screen
 ***/
export const ContractorSuspendConfirmedScreen = observer(() => {
  const { t } = useTranslation();
  const { contractorId } = useParams<{ contractorId: string }>();
  const { contractorStore } = useMst();

  const contractor = contractorStore.contractorsMap.get(contractorId!);
  const handleBackToManage = useBackToContractorManagement();

  return (
    <SuccessfulActionScreen
      icon="warning"
      title={t('contractor.suspend.confirmed.title')}
      referenceNumber={contractor?.number ? `#${contractor.number}` : undefined}
      referenceLabel={t('contractor.contractorLabel')}
      primaryButtonLabel={t('contractor.suspend.confirmed.backButton')}
      primaryButtonTo="/contractor-management"
      onButtonClick={handleBackToManage}
    />
  );
});

/***
 * Contractor Unsuspend Confirmation Screen
 ***/
export const ContractorUnsuspendConfirmedScreen = observer(() => {
  const { t } = useTranslation();
  const { contractorId } = useParams<{ contractorId: string }>();
  const { contractorStore } = useMst();

  const contractor = contractorStore.contractorsMap.get(contractorId!);

  useEffect(() => {
    if (contractorId && !contractor) {
      contractorStore.fetchContractor(contractorId);
    }
  }, [contractorId, contractor, contractorStore]);

  const handleBackToManage = useBackToContractorManagement();

  return (
    <SuccessfulActionScreen
      icon="success"
      title={t('contractor.unsuspend.confirmed.title')}
      referenceNumber={contractor?.number ? `#${contractor.number}` : undefined}
      referenceLabel={t('contractor.contractorLabel')}
      primaryButtonLabel={t('contractor.suspend.confirmed.backButton')}
      primaryButtonTo="/contractor-management"
      onButtonClick={handleBackToManage}
    />
  );
});

/***
 * Contractor Remove Confirmation Screen
 ***/
export const ContractorRemoveConfirmedScreen = observer(() => {
  const { t } = useTranslation();
  const { contractorId } = useParams<{ contractorId: string }>();
  const { contractorStore } = useMst();

  const contractor = contractorStore.contractorsMap.get(contractorId!);
  const handleBackToManage = useBackToContractorManagement();

  return (
    <SuccessfulActionScreen
      icon="warning"
      title={t('contractor.remove.confirmed.title')}
      referenceNumber={contractor?.number ? `#${contractor.number}` : undefined}
      referenceLabel={t('contractor.contractorLabel')}
      primaryButtonLabel={t('contractor.remove.confirmed.backButton')}
      primaryButtonTo="/contractor-management"
      onButtonClick={handleBackToManage}
    />
  );
});

/***
 * Onboarding Approval Success
 ***/
export const SuccessfulOnboardingApprovalScreen = observer(() => {
  const { t } = useTranslation();
  const location = useLocation();
  const { submissionType, applicationNumber } = location.state || {};

  const { userStore } = useMst();
  const currentUser = userStore.currentUser;

  return (
    <SuccessfulActionScreen
      icon="success"
      title={t('contractorOnboarding.approval.successTitle', {
        submissionType: submissionType?.toLowerCase(),
      })}
      subtitle={t('contractorOnboarding.approval.successMessage')}
      referenceNumber={applicationNumber}
      primaryButtonLabel={
        currentUser.isParticipant
          ? t('energySavingsApplication.returnToMain')
          : t('energySavingsApplication.new.viewAllSubmissions')
      }
      primaryButtonTo={currentUser.isParticipant ? '/applications' : '/submission-inbox'}
    />
  );
});
