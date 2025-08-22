import { Container, Grid, GridItem, Heading, VStack } from '@chakra-ui/react';
import { FlagBanner, House, Info, NotePencil, Question, Users } from '@phosphor-icons/react';
import { t } from 'i18next';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { HomeScreenBox } from '../../home/home-screen-box';

export const SiteConfigurationManagementScreen = observer(function SiteConfigurationManagementScreen() {
  const i18nPrefix = 'siteConfiguration';

  return (
    <Container maxW="container.lg" py={8} px={{ base: 8, xl: 0 }} flexGrow={1} minH="100vh">
      <VStack spacing={8} align="start" h="full">
        <Heading mb={0} fontSize="3xl" color="theme.blueAlt">
          {t(`${i18nPrefix}.title`)}
        </Heading>

        <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={6} flex="1" w="full">
          <GridItem>
            <HomeScreenBox
              title={t(`${i18nPrefix}.sitewideMessage.title`)}
              description={t(`${i18nPrefix}.sitewideMessage.description`)}
              linkText={t('ui.edit')}
              icon={<FlagBanner size="24px" color="var(--chakra-colors-text-link)" />}
              href="sitewide-banner"
              h="full"
            />
          </GridItem>
          {/* <GridItem>
            <HomeScreenBox
              title={t(`${i18nPrefix}.adminUserIndex.title`)}
              description={t(`${i18nPrefix}.adminUserIndex.description`)}
              linkText={t('ui.edit')}
              icon={<Users size="24px" color="var(--chakra-colors-text-link)" />}
              href="users"
              h="full"
            />
          </GridItem> */}
          <GridItem>
            <HomeScreenBox
              title={t(`${i18nPrefix}.helpDrawerSetup.title`)}
              description={t(`${i18nPrefix}.helpDrawerSetup.description`)}
              linkText={t('ui.edit')}
              icon={<Info size="24px" />}
              href="help-drawer-setup"
              h="full"
              pointerEvents="none"
              bg="gray.white"
              headingColor="greys.grey05"
            />
          </GridItem>
          <GridItem>
            <HomeScreenBox
              title={t(`${i18nPrefix}.revisionReasonsAttributesSetup.title`)}
              description={t(`${i18nPrefix}.revisionReasonsAttributesSetup.description`)}
              linkText={t('ui.edit')}
              icon={<NotePencil size="24px" color="var(--chakra-colors-text-link)" />}
              href="revision-reason-setup"
              h="full"
            />
          </GridItem>
        </Grid>
      </VStack>
    </Container>
  );
});
