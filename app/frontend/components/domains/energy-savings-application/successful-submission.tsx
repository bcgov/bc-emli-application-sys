import { Box, Button, Container, Flex, Heading, Icon, Tag, Text, VStack } from '@chakra-ui/react';
import { CheckCircleIcon } from '@phosphor-icons/react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { usePermitApplication } from '../../../hooks/resources/use-permit-application';
import { ErrorScreen } from '../../shared/base/error-screen';
import { LoadingScreen } from '../../shared/base/loading-screen';
import { RouterLinkButton } from '../../shared/navigation/router-link-button';
import { useLocation } from 'react-router-dom';
import { useMst } from '../../../setup/root';

// Successful Submission Screen
export const SuccessfulSubmissionScreen = observer(() => {
  const { t } = useTranslation();
  const { currentPermitApplication, error } = usePermitApplication();
  const location = useLocation();
  const message = location.state?.message;
  const performedBy = location.state?.performedBy;

  if (error) return <ErrorScreen error={error} />;
  if (!currentPermitApplication?.isFullyLoaded) return <LoadingScreen />;

  const { number } = currentPermitApplication;
  const { userStore } = useMst();
  const currentUser = userStore.currentUser;

  const determinedMessage = currentPermitApplication.isSupportRequest
    ? t('energySavingsApplication.show.supportingFilesRequest.filesUploaded')
    : currentPermitApplication.isContractorOnboarding
      ? t('contractorOnboarding.submissionSuccess')
      : message;

  // determine “What’s Next” content dynamicall

  let whatsNextHeadingKey: string | undefined;
  let whatsNextLineKeys: string[] = [];
  let whatsNextEmail: string | null = null;

  // Example logic: define when & what to show
  if (currentPermitApplication.isContractorOnboarding) {
    whatsNextHeadingKey = 'contractorOnboarding.whatsNext.heading';
    whatsNextLineKeys = [
      'contractorOnboarding.whatsNext.line1',
      'contractorOnboarding.whatsNext.line2',
      'contractorOnboarding.whatsNext.line3',
    ];
    whatsNextEmail = t('site.support.contractorSupportEmail');
  }

  return (
    <Container maxW="container.lg">
      <Flex direction="column" align="center" my={24} gap={8}>
        <Icon as={CheckCircleIcon} boxSize="14" color="theme.darkGreen" />
        <VStack>
          <Heading as="h1" color="theme.blueAlt">
            {determinedMessage}
          </Heading>
          <Tag mt="4" color="semantic.info" border="1px solid" borderColor="semantic.info" p={2}>
            {t('energySavingsApplication.new.yourReference', { number })}
          </Tag>
        </VStack>
        {whatsNextHeadingKey && whatsNextLineKeys.length > 0 && (
          <WhatsNextBlock headingKey={whatsNextHeadingKey} lineKeys={whatsNextLineKeys} email={whatsNextEmail} />
        )}
        <SubmissionReturnButton
          currentUser={currentUser}
          performedBy={performedBy}
          currentPermitApplication={currentPermitApplication}
        />
      </Flex>
    </Container>
  );
});

// Flexible WhatsNextBlock component
interface WhatsNextBlockProps {
  headingKey: string;
  lineKeys: string[];
  email?: string | null;
}

const WhatsNextBlock = ({ headingKey, lineKeys, email }: WhatsNextBlockProps) => {
  const { t } = useTranslation();

  // Filter out any lines whose translation resolves to an empty string
  const nonEmptyLines = lineKeys.filter((key) => t(key, { defaultValue: '' }).trim().length > 0);

  if (nonEmptyLines.length === 0) return null;

  return (
    <Box mt={12} p={8} borderRadius="md" backgroundColor="semantic.infoLight">
      <Text fontSize="3xl" fontWeight="bold" mb={4} pb={1} width="fit-content">
        {t(headingKey)}
      </Text>

      <VStack align="start" spacing={4}>
        {lineKeys.map((key) => (
          <Text fontSize="lg" key={key}>
            <Trans
              i18nKey={key}
              values={{ email: email ?? '' }}
              components={
                email
                  ? {
                      1: (
                        <Button
                          as="a"
                          href={`mailto:${email}`}
                          variant="link"
                          color="theme.blueAlt"
                          textDecoration="underline"
                          p={0}
                          h="auto"
                        />
                      ),
                    }
                  : {}
              }
            />
          </Text>
        ))}
      </VStack>
    </Box>
  );
};

interface SubmissionReturnButtonProps {
  currentUser: any;
  performedBy?: string;
  currentPermitApplication: any;
}

const SubmissionReturnButton = ({
  currentUser,
  performedBy,
  currentPermitApplication,
}: SubmissionReturnButtonProps) => {
  const { t } = useTranslation();

  // Determine route + label dynamically
  let returnPath = '/';
  let returnLabel = t('energySavingsApplication.returnHome');

  if (currentUser.isParticipant) {
    returnPath = '/applications';
    returnLabel = t('energySavingsApplication.new.viewAllSubmissions');
  } else if (performedBy === 'staff') {
    returnPath = '/submission-inbox';
    returnLabel = t('ui.backToInbox');
  } else if (currentPermitApplication.isContractorOnboarding) {
    returnPath = '/welcome/contractor';
    returnLabel = t('contractorOnboarding.returnToDashboard');
  } else if (currentPermitApplication.isSupportRequest) {
    returnPath = '/supported-applications';
    returnLabel = t('supportRequest.returnToList');
  }

  return (
    <RouterLinkButton to={returnPath} variant="primary">
      {returnLabel}
    </RouterLinkButton>
  );
};
