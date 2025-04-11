import { Container, Flex } from '@chakra-ui/react';
import { BookOpen, Buildings, Clock, FileText, Folder, Pencil } from '@phosphor-icons/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { IHomeScreenProps } from '.';
import { BlueTitleBar } from '../../shared/base/blue-title-bar';
import { HomeScreenBox } from './home-screen-box';

export const AdminManagerHomeScreen = ({ ...rest }: IHomeScreenProps) => {
  const { t } = useTranslation();

  return (
    <Flex as="main" direction="column" w="full" bg="greys.white" pb="24">
      <BlueTitleBar title={t('home.adminManagerTitle')} />
      <Container maxW="container.md" py={16}>
        <Flex direction="column" align="center" w="full">
          <Flex direction="column" align="center" w="full" gap={6}>
            <HomeScreenBox
              title={t('home.contractorTitle')}
              description={t('home.contractorDescription')}
              icon={<Buildings size={24} />}
              href="/contractor-management"
            />
            <HomeScreenBox
              title={t('home.submissionInboxSetupTitle')}
              description={t('home.submissionInboxSetupDescription')}
              icon={<FileText size={24} />}
              href="/submission-inbox-setup"
            />
            <HomeScreenBox
              title={t('home.submissionInboxTitle')}
              description={t('home.submissionInboxDescription')}
              icon={<FileText size={24} />}
              href="/submission-inbox"
              linkText={t('ui.view')}
            />
            <HomeScreenBox
              title={t('home.applicationsDashboardTitle')}
              description={t('home.applicationsDashboardDescription')}
              icon={<BookOpen size={24} />}
              href="/applications-dashboard"
              linkText={t('ui.review')}
            />
            <HomeScreenBox
              title={t('home.configureUsersTitle')}
              description={t('home.configureUsersDescription')}
              icon={<Pencil size={24} />}
              href="/configure-users"
              linkText={t('ui.configure')}
            />
            <HomeScreenBox
              title={t('home.apiSettingsTitle')}
              description={t('home.apiSettingsDescription')}
              icon={<Folder size={24} />}
              href="/api-settings"
              pointerEvents="none"
              opacity={0.6}
              bg="gray.100"
              linkText={t('ui.comingSoon')}
            />
            <HomeScreenBox
              title={t('home.reportingTitle')}
              description={t('home.reportingDescription')}
              icon={<Folder size={24} />}
              href="/reporting"
              pointerEvents="none"
              opacity={0.6}
              bg="gray.100"
              linkText={t('ui.comingSoon')}
            />
            <HomeScreenBox
              title={t('home.earlyAccess.title')}
              description={t('home.earlyAccess.adminDescription')}
              icon={<Clock size={24} />}
              href="/early-access"
              pointerEvents="none"
              opacity={0.6}
              bg="gray.100"
              linkText={t('ui.comingSoon')}
            />
          </Flex>
        </Flex>
      </Container>
    </Flex>
  );
};
