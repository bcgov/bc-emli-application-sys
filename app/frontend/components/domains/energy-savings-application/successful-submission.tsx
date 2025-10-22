import { Container, Flex, Heading, Icon, Tag, VStack } from '@chakra-ui/react';
import { CheckCircleIcon } from '@phosphor-icons/react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { usePermitApplication } from '../../../hooks/resources/use-permit-application';
import { ErrorScreen } from '../../shared/base/error-screen';
import { LoadingScreen } from '../../shared/base/loading-screen';
import { RouterLinkButton } from '../../shared/navigation/router-link-button';
import { useLocation } from 'react-router-dom';
import { useMst } from '../../../setup/root';

export const SuccessfulSubmissionScreen = observer(() => {
  const { t } = useTranslation();
  const { currentPermitApplication, error } = usePermitApplication();
  const location = useLocation();
  const message = location.state?.message;
  const performedBy = location.state?.performedBy;

  if (error) return <ErrorScreen error={error} />;
  if (!currentPermitApplication?.isFullyLoaded) return <LoadingScreen />;

  const isSupportRequest =
    currentPermitApplication?.submissionType?.code === 'support_request' &&
    currentPermitApplication?.userGroupType?.code === 'participant'
      ? true
      : false;

  const { number } = currentPermitApplication;
  const { userStore } = useMst();

  const determinedMessage = isSupportRequest ? 'Supporting file(s) successfully uploaded' : message;

  const currentUser = userStore.currentUser;
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
        <RouterLinkButton
          to={
            currentUser.isParticipant
              ? `/applications`
              : performedBy === 'staff'
                ? '/submission-inbox'
                : '/supported-applications'
          }
          variant="primary"
        >
          {currentUser.isParticipant
            ? t('energySavingsApplication.new.viewAllSubmissions')
            : performedBy === 'staff'
              ? t('ui.backToInbox')
              : t('energySavingsApplication.returnHome')}
        </RouterLinkButton>
      </Flex>
    </Container>
  );
});
