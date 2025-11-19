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
              icon={<Tray size={24} />}
              href="/submission-inbox"
            />
            <HomeScreenBox
              title={t('home.startApplicationTitle')}
              description=""
              icon={<Pencil size={24} />}
              href="/new-application"
            />
            <HomeScreenBox
              title={t('home.viewBlankApplicationsTitle')}
              description=""
              icon={<MagnifyingGlass size={24} />}
              href="/blank-applications"
            />
            <HomeScreenBox
              title={t('home.viewSupportedApplicationsTitle')}
              description=""
              icon={<ClipboardText size={24} />}
              href="/supported-applications"
            />
            <HomeScreenBox
              title={t('home.contractorTitle')}
              description=""
              icon={<NotePencil size={24} />}
              href="/contractor-management"
              h="full"
            />
            <HomeScreenBox
              title={t('home.contractorProgramResources')}
              description=""
              icon={<File size={24} />}
              href="/contractor-program-resources"
              h="full"
            />
          </Flex>
        </Flex>
      </Container>
    </Flex>
  );
};
