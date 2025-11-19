import { Container, Flex } from '@chakra-ui/react';
import {
  ClipboardTextIcon,
  ClockIcon,
  FolderIcon,
  NotePencilIcon,
  PencilIcon,
  TrayIcon,
  UsersIcon,
  MagnifyingGlassIcon,
  FileIcon,
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
              icon={<TrayIcon size={24} />}
              href="/submission-inbox"
            />

            <HomeScreenBox
              title={t('home.startApplicationTitle')}
              description=""
              icon={<PencilIcon size={24} />}
              href="/new-application"
            />
            <HomeScreenBox
              title={t('home.viewBlankApplicationsTitle')}
              description=""
              icon={<MagnifyingGlassIcon size={24} />}
              href="/blank-applications"
            />
            <HomeScreenBox
              title={t('home.viewSupportedApplicationsTitle')}
              description=""
              icon={<ClipboardTextIcon size={24} />}
              href="/supported-applications"
            />
            <HomeScreenBox
              title={t('home.configureUsersTitle')}
              description=""
              icon={<UsersIcon size={24} />}
              href="/configure-users"
            />
            <HomeScreenBox
              title={t('home.contractorTitle')}
              description=""
              icon={<NotePencilIcon size={24} />}
              href="/contractor-management"
              h="full"
            />
            <HomeScreenBox
              title={t('home.contractorProgramResources')}
              description=""
              //description={t('home.contractorDescription')}
              icon={<FileIcon size={24} />}
              href="/contractor-management"
              pointerEvents="none"
              h="full"
            />

            <HomeScreenBox
              title={t('home.reportingTitle')}
              description=""
              //description={t('home.reportingDescription')}
              icon={<FolderIcon size={24} />}
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
              icon={<ClockIcon size={24} />}
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
