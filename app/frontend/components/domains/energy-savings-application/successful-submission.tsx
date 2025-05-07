import { Container, Divider, Flex, Heading, Icon, Image, Tag, Text, VStack } from '@chakra-ui/react';
import { CheckCircle } from '@phosphor-icons/react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { usePermitApplication } from '../../../hooks/resources/use-permit-application';
import { ErrorScreen } from '../../shared/base/error-screen';
import { LoadingScreen } from '../../shared/base/loading-screen';
import { ContactCard } from '../../shared/jurisdiction/contact-card';
import { RouterLinkButton } from '../../shared/navigation/router-link-button';
import SandboxHeader from '../../shared/sandbox/sandbox-header';

export const SuccessfulSubmissionScreen = observer(() => {
  const { t } = useTranslation();
  const { currentPermitApplication, error } = usePermitApplication();

  if (error) return <ErrorScreen error={error} />;
  if (!currentPermitApplication?.isFullyLoaded) return <LoadingScreen />;

  const { program, number } = currentPermitApplication;
  const { qualifiedName, primaryContact } = program;
  return (
    <Container maxW="container.lg">
      <Flex direction="column" align="center" my={24} gap={8}>
        <Icon as={CheckCircle} boxSize="14" color="semantic.success" />

        <VStack>
          <Heading as="h1" color="theme.blueAlt">
            {t('energySavingsApplication.new.submitted')}
          </Heading>
          <Tag mt="4" color="semantic.info" border="1px solid" borderColor="semantic.info" p={2}>
            {t('permitApplication.new.yourReference', { number })}
          </Tag>
        </VStack>
        <RouterLinkButton to={`/programs/submission-inbox`} variant="primary">
          {t('energySavingsApplication.new.viewAllSubmissions')}
        </RouterLinkButton>
      </Flex>
    </Container>
  );
});
