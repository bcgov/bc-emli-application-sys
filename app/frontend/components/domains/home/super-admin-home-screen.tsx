import { Container, Flex } from '@chakra-ui/react';
import { BookOpen, Buildings, Clock, FileText, Folder, Pencil } from '@phosphor-icons/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { IHomeScreenProps } from '.';
import { BlueTitleBar } from '../../shared/base/blue-title-bar';
import { HomeScreenBox } from './home-screen-box';

export const SuperAdminHomeScreen = ({ ...rest }: IHomeScreenProps) => {
  const { t } = useTranslation();

  return (
    <Flex as="main" direction="column" w="full" bg="greys.white" pb="24">
      <BlueTitleBar title={t('home.systemAdminTitle')} />
      <Container maxW="container.md" py={16}>
        <Flex direction="column" align="center" w="full">
          <Flex direction="column" align="center" w="full" gap={6}>
            <HomeScreenBox
              title={t('home.jurisdictionsTitle')}
              description=""
              icon={<Buildings size={24} />}
              href="/programs"
            />
            <HomeScreenBox
              title={t('home.permitTemplateCatalogueTitle')}
              description=""
              icon={<FileText size={24} />}
              href="/requirement-templates"
            />
            <HomeScreenBox
              title={t('home.requirementsLibraryTitle')}
              description=""
              icon={<BookOpen size={24} />}
              href="/requirements-library"
            />
            <HomeScreenBox
              title={t('home.configurationManagement.title')}
              description=""
              icon={<Pencil size={24} />}
              href="/configuration-management"
            />
            <HomeScreenBox
              title={t('home.reportingTitle')}
              description=""
              icon={<Folder size={24} />}
              href="/reporting"
              pointerEvents="none"
              h="full"
              bg="greys.grey10"
              headingColor="greys.homeScreenGrey"
              isDisabled={true}
            />
            <HomeScreenBox
              title={t('home.earlyAccess.title')}
              description=""
              icon={<Clock size={24} />}
              href="/early-access"
              pointerEvents="none"
              h="full"
              bg="greys.grey10"
              headingColor="greys.homeScreenGrey"
              isDisabled={true}
            />
          </Flex>
        </Flex>
      </Container>
    </Flex>
  );
};
