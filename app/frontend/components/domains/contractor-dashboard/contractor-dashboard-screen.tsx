import {
  Box,
  Container,
  Flex,
  Skeleton,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  VStack,
} from '@chakra-ui/react';
import { observer } from 'mobx-react-lite';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMst } from '../../../setup/root';
import { EPermitClassificationCode } from '../../../types/enums';
import { ContractorProgramResourcesScreen } from '../contractor-management/contractor-program-resources-screen';
import { EnergySavingsApplicationIndexScreen } from '../energy-savings-application';
import { BlueTitleBar } from '../../shared/base/blue-title-bar';

export const ContractorDashboardScreen = observer(function ContractorDashboard() {
  const { t } = useTranslation();
  const { permitApplicationStore } = useMst();
  const [tabIndex, setTabIndex] = useState(0);

  // Set filters for contractor invoice submissions synchronously before first render
  React.useMemo(() => {
    permitApplicationStore.setSubmissionTypeFilter(EPermitClassificationCode.invoice);
    permitApplicationStore.setUserGroupFilter(EPermitClassificationCode.contractor);
    permitApplicationStore.setAudienceTypeFilter(EPermitClassificationCode.external);
  }, [permitApplicationStore]);

  const selectedTabStyles = {
    color: 'theme.blueAlt',
    borderBottomColor: 'theme.blueAlt',
    borderBottomWidth: '3px',
    fontWeight: 'bold',
  };

  return (
    <Flex as="main" direction="column" w="full" bg="greys.white" pb="24" minH="100vh">
      <BlueTitleBar title={t('landing.contractor.dashboard.title', 'Contractor portal')} />

      <Container maxW="container.lg" pb={4} flex="1">
        <Tabs index={tabIndex} onChange={setTabIndex} variant="unstyled" w="full" pt={6} h="full" display="flex" flexDirection="column">
          <TabList borderBottom="2px solid" borderColor="greys.grey20">
            <Tab
              px={4}
              py={2}
              _selected={selectedTabStyles}
              _focus={{
                outline: 'none',
                boxShadow: 'none',
              }}
              _focusVisible={{
                outline: '2px solid',
                outlineColor: 'theme.blue',
                outlineOffset: '2px',
              }}
            >
              {t('landing.contractor.dashboard.invoiceSubmission', 'Invoice submissions')}
            </Tab>
            <Box px={2} py={2} color="greys.dividerGrey">
              |
            </Box>
            <Tab
              px={4}
              py={2}
              _selected={selectedTabStyles}
              _focus={{
                outline: 'none',
                boxShadow: 'none',
              }}
              _focusVisible={{
                outline: '2px solid',
                outlineColor: 'theme.blue',
                outlineOffset: '2px',
              }}
            >
              {t('landing.contractor.dashboard.programResources', 'Program resources')}
            </Tab>
          </TabList>

          <TabPanels flex="1" minH="500px">
            <TabPanel px={0} pt={0} h="full">
              <EnergySavingsApplicationIndexScreen
                skipDefaultFilters={true}
                hideBlueSection={true}
                customButtonText={t('landing.contractor.dashboard.submitInvoice', 'Submit invoice')}
                customButtonLink="/new-invoice"
                customEmptyMessage={t('landing.contractor.dashboard.uploadInfo', 'You will need to upload your invoice and supporting documentation. Have them ready before you begin.')}
              />
            </TabPanel>

            <TabPanel px={0} pt={0} h="full">
              <ContractorProgramResourcesScreen hideBlueSection />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Container>
    </Flex>
  );
});