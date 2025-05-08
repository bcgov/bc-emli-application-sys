import { Container, Flex } from '@chakra-ui/react';
import {
  BookOpen,
  Buildings,
  ClipboardText,
  Clock,
  Envelope,
  FileText,
  Folder,
  NotePencil,
  Pencil,
  SlidersHorizontal,
  Tray,
  Users,
  MagnifyingGlass,
  UserSquare,
  File,
} from '@phosphor-icons/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { IHomeScreenProps } from '.';
import { BlueTitleBar } from '../../shared/base/blue-title-bar';
import { HomeScreenBox } from './home-screen-box';

export const AdminManagerHomeScreen = ({ ...rest }: IHomeScreenProps) => {
  const { t } = useTranslation();

  return (
    <Flex as="main" direction="column" w="full" bg="greys.white" pb="16">
      <BlueTitleBar title={t('home.adminManagerTitle')} />
      <Container maxW="container.md" py={16}>
        <Flex direction="column" align="center" w="full">
          <Flex direction="column" align="center" w="full" gap={6}>
            <HomeScreenBox
              title={t('home.submissionInboxTitle')}
              description=""
              //description={t('home.adminSubmissionInboxDescription')}
              icon={<Tray size={24} />}
              href="/programs/submission-inbox"
              //linkText={t('ui.view')}
            />

            <HomeScreenBox
              title={t('home.startApplicationTitle')}
              description=""
              //description={t('home.startApplicationDescription')}
              icon={<Pencil size={24} />}
              href=""
              //inkText={t('ui.start')}
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
              //description={t('home.applicationsDashboardDescription')}
              icon={<ClipboardText size={24} />}
              href="/applications-dashboard"
              //linkText={t('ui.review')}
            />
            <HomeScreenBox
              title={t('home.configureUsersTitle')}
              description=""
              //description={t('home.applicationsDashboardDescription')}
              icon={<Users size={24} />}
              href="/applications-dashboard"
              //linkText={t('ui.review')}
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

            <HomeScreenBox
              title={t('home.reportingTitle')}
              description=""
              //description={t('home.reportingDescription')}
              icon={<Folder size={24} />}
              href="/reporting"
              pointerEvents="none"
              h="full"
              bg="greys.grey10"
              headingColor="greys.homeScreenGrey"
              linkText={t('ui.comingSoon')}
            />
            <HomeScreenBox
              title={t('home.earlyAccess.title')}
              description=""
              //description={t('home.earlyAccess.adminDescription')}
              icon={<Clock size={24} />}
              href="/early-access"
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
