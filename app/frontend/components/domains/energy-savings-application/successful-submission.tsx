import { Box, Button, Container, Divider, Flex, Heading, Icon, Tag, Text, VStack } from '@chakra-ui/react';
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
import { GreenLineSmall } from '../../shared/base/decorative/green-line-small';

// Successful Submission Screen
export const SuccessfulSubmissionScreen = observer(() => {
  const { t } = useTranslation();
  const { currentPermitApplication, error } = usePermitApplication();
  const location = useLocation();
  const performedBy = location.state?.performedBy;

  if (error) return <ErrorScreen error={error} />;
  if (!currentPermitApplication?.isFullyLoaded) return <LoadingScreen />;

  const { number, submissionType, activity } = currentPermitApplication;
  const { userStore } = useMst();
  const currentUser = userStore.currentUser;

  // Get submission type for the heading - use submissionType.name, fallback to activity.name
  const rawLabel = submissionType?.name || activity?.name || 'application';
  // Ensure first letter is lowercase
  const submissionTypeLabel = rawLabel.charAt(0).toLowerCase() + rawLabel.slice(1);

  // Use translation with fallback to dynamic message format
  const determinedMessage = t('energySavingsApplication.new.submissionSuccess', {
    submissionType: submissionTypeLabel,
    defaultValue: `Your ${submissionTypeLabel} form has been submitted!`,
  });

  // determine "What's Next" content dynamically

  let whatsNextHeadingKey: string = 'whatsNext.heading';
  let whatsNextLineKeys: string[] = ['whatsNext.line1'];
  let whatsNextEmail: string | null = null;

  // Override for contractor onboarding
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
    <Container maxW="container.lg" width="60%">
      <Flex direction="column" align="center" my={24}>
        <Icon as={CheckCircleIcon} boxSize="14" color="theme.darkGreen" mb={4} />
        <VStack spacing={4} mb={0}>
          <Heading as="h1" color="theme.blueAlt" textAlign="center">
            {determinedMessage}
          </Heading>
          <Text fontSize="md" color="greys.grey70" textAlign="center">
            {t('energySavingsApplication.new.confirmationEmail', {
              defaultValue: 'A confirmation email has been sent to your account.',
            })}
          </Text>
          <Tag color="semantic.info" border="1px solid" borderColor="semantic.info" p={2}>
            {t('energySavingsApplication.new.yourReference', { number })}
          </Tag>
        </VStack>

        <WhatsNextBlock headingKey={whatsNextHeadingKey} lineKeys={whatsNextLineKeys} email={whatsNextEmail} />
        <Box px={8} width="100%" backgroundColor="greys.grey10">
          <Divider borderColor="greys.lightGrey" />
        </Box>
        <NeedHelpBlock />
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

  // Use default heading if translation is missing or returns "Not found"
  const translatedHeading = t(headingKey as any, { defaultValue: "What's next?" }) as string;
  const heading =
    translatedHeading === headingKey || translatedHeading.includes('Not found') ? "What's next?" : translatedHeading;

  // Use default content if translation is missing
  const defaultContent =
    'We will review your application. If we need more information or change the status of your application, we will send you an email. Please check your inbox regularly for updates to your application.';

  return (
    <Box mt={6} p={8} borderRadius="md" backgroundColor="greys.grey10" width="100%">
      <GreenLineSmall />
      <Text fontSize="2xl" fontWeight="bold" mb={4}>
        {heading}
      </Text>

      <VStack align="start" spacing={4}>
        {lineKeys.length > 0 ? (
          lineKeys.map((key, index) => {
            const translatedText = t(key as any, { defaultValue: '' }) as string;
            // Check if translation failed (empty, same as key, or contains "Not found")
            const isTranslationMissing =
              !translatedText ||
              translatedText.trim().length === 0 ||
              translatedText === key ||
              translatedText.includes('Not found');

            if (isTranslationMissing && index === 0) {
              return (
                <Text fontSize="md" key={key}>
                  {defaultContent}
                </Text>
              );
            }
            return !isTranslationMissing ? (
              <Text fontSize="md" key={key}>
                <Trans
                  i18nKey={key as any}
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
            ) : null;
          })
        ) : (
          <Text fontSize="md">{defaultContent}</Text>
        )}
      </VStack>
    </Box>
  );
};

// Need Help Block component
const NeedHelpBlock = () => {
  const { t } = useTranslation();
  const email = 'betterhomesbc@gov.bc.ca';

  return (
    <Box mb={6} p={8} borderRadius="md" backgroundColor="greys.grey10" width="100%">
      <Text fontSize="md" mb={4}>
        <Text as="span" fontWeight="bold">
          {t('energySavingsApplication.new.hearBack', { defaultValue: 'Need help?' })}
        </Text>{' '}
        <Trans
          i18nKey="energySavingsApplication.new.contactInstruction"
          values={{ email }}
          defaults="See the status of your application or your application history any time by logging in to the Better Homes Energy Savings Program. Contact <1>{{email}}</1> if you have any questions about your application."
          components={{
            1: (
              <Button
                as="a"
                href={`mailto:${email}`}
                variant="link"
                color="theme.blueAlt"
                textDecoration="underline"
                p={0}
                h="auto"
                fontSize="md"
              />
            ),
          }}
        />
      </Text>
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
    returnLabel = t('supportRequest.returnToList' as any);
  }

  return (
    <RouterLinkButton to={returnPath} variant="primary" mt={4} size="md">
      {returnLabel}
    </RouterLinkButton>
  );
};
