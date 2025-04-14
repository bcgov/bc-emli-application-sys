import { Container, Flex } from '@chakra-ui/react';
import { BookOpen, Buildings, ClipboardText, Clock, FileText, Folder, Pencil, Tray } from '@phosphor-icons/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { IHomeScreenProps } from '.';
import { BlueTitleBar } from '../../shared/base/blue-title-bar';
import { HomeScreenBox } from './home-screen-box';

export const AdminHomeScreen = ({ ...rest }: IHomeScreenProps) => {
  const { t } = useTranslation();

  return (
    <Flex as="main" direction="column" w="full" bg="greys.white" pb="24">
      <BlueTitleBar title={t('home.adminTitle')} />
      <Container maxW="container.md" py={16}>
        <Flex direction="column" align="center" w="full">
          <Flex direction="column" align="center" w="full" gap={6}>
            <HomeScreenBox
              title={t('home.submissionInboxTitle')}
              description={t('home.adminSubmissionInboxDescription')}
              icon={<Tray size={24} />}
              href="/submission-inbox"
              linkText={t('ui.view')}
            />
            <HomeScreenBox
              title={t('home.applicationsDashboardTitle')}
              description={t('home.adminApplicationsDashboardDescription')}
              icon={<ClipboardText size={24} />}
              href="/applications-dashboard"
              linkText={t('ui.review')}
            />
            <HomeScreenBox
              title={t('home.startApplicationTitle')}
              description={t('home.startApplicationDescription')}
              icon={<Pencil size={24} />}
              href=""
              linkText={t('ui.start')}
            />
          </Flex>
        </Flex>
      </Container>
    </Flex>
  );
};
