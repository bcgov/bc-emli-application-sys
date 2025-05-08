import { Container, Flex } from '@chakra-ui/react';
import {
  BookOpen,
  Buildings,
  ClipboardText,
  Clock,
  FileText,
  Folder,
  Pencil,
  Tray,
  NotePencil,
  MagnifyingGlass,
  File,
} from '@phosphor-icons/react';
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
              description=""
              // description={t('home.adminSubmissionInboxDescription')}
              icon={<Tray size={24} />}
              href="/programs/submission-inbox"
              // linkText={t('ui.view')}
            />
            <HomeScreenBox
              title={t('home.startApplicationTitle')}
              description=""
              //description={t('home.startApplicationDescription')}
              icon={<Pencil size={24} />}
              href=""
              //linkText={t('ui.start')}
            />
            <HomeScreenBox
              title={t('home.viewBlankApplicationsTitle')}
              description=""
              //description={t('home.startApplicationDescription')}
              icon={<MagnifyingGlass size={24} />}
              href=""
              //linkText={t('ui.start')}
            />
            <HomeScreenBox
              title={t('home.applicationsDashboardTitle')}
              description=""
              // description={t('home.adminApplicationsDashboardDescription')}
              icon={<ClipboardText size={24} />}
              href="/applications-dashboard"
              // linkText={t('ui.review')}
            />
            <HomeScreenBox
              title={t('home.contractorTitle')}
              description=""
              //description={t('home.contractorDescription')}
              icon={<NotePencil size={24} />}
              href="/contractor-management"
              pointerEvents="none"
              h="full"
              bg="greys.grey10"
              headingColor="greys.homeScreenGrey"
              linkText={t('ui.comingSoon')}
            />
            <HomeScreenBox
              title={t('home.contractorProgramResources')}
              description=""
              //description={t('home.contractorDescription')}
              icon={<File size={24} />}
              href="/contractor-management"
              pointerEvents="none"
              h="full"
              bg="greys.grey10"
              headingColor="greys.homeScreenGrey"
              linkText={t('ui.comingSoon')}
            />
          </Flex>
        </Flex>
      </Container>
    </Flex>
  );
};
