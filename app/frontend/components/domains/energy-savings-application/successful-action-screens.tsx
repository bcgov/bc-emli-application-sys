import { Container, Flex, Heading, Icon, Text, VStack, Box } from '@chakra-ui/react';
import { CheckCircleIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { RouterLinkButton } from '../../shared/navigation/router-link-button';
import { SubmissionReturnButton } from '../../shared/energy-savings-applications/submission-action-return-button';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { useLocation, useParams } from 'react-router-dom';
import { useMst } from '../../../setup/root';
import React, { useEffect, useState } from 'react';

/***
 * Base Reusable Success Screen
 ***/
type IconType = 'success' | 'warning' | React.ReactNode;

interface SuccessfulActionScreenProps {
  icon?: IconType;
  title: string;
  subtitle?: string;
  referenceNumber?: string;
  primaryButtonLabel: string;
  primaryButtonTo: string;
}

export const SuccessfulActionScreen = ({
  icon = 'success',
  title,
  subtitle,
  referenceNumber,
  primaryButtonLabel,
  primaryButtonTo,
}: SuccessfulActionScreenProps) => {
  const resolveIcon = () => {
    if (React.isValidElement(icon)) return icon;

    if (icon === 'warning') {
      return <Icon as={WarningCircleIcon} boxSize={12} color="orange.400" />;
    }

    return <Icon as={CheckCircleIcon} boxSize={12} color="green.500" />;
  };

  return (
    <Container maxW="container.lg">
      <Flex direction="column" align="center" my={24} gap={8}>
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
            <Box border="1px solid" borderColor="border.light" px={4} py={2} borderRadius="md" fontSize="sm">
              Reference # {referenceNumber}
            </Box>
          )}
        </VStack>

        <RouterLinkButton
          to={primaryButtonTo}
          bg="theme.darkBlue"
          color="white"
          px={8}
          _hover={{ bg: 'theme.blueButtonHover' }}
        >
          {primaryButtonLabel}
        </RouterLinkButton>
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
  const { submissionType } = location.state || {};
  const { userStore, permitApplicationStore } = useMst();
  const currentUser = userStore.currentUser;

  const { permitApplicationId } = useParams();

  const permitApplication = permitApplicationStore.fetchPermitApplication(permitApplicationId);
  return (
    <SuccessfulActionScreen
      icon="warning"
      title={t('energySavingsApplication.review.markedIneligible', {
        submissionType: submissionType?.toLowerCase(),
      })}
      subtitle={t('energySavingsApplication.review.ineligibleNextSteps')}
      referenceNumber={permitApplication?.number}
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
