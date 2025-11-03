import { Box, Container, Flex, Heading, Tab, Tabs, TabList, TabPanel, TabPanels, VStack, Text } from '@chakra-ui/react';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearch } from '../../../hooks/use-search';
import { IContractor } from '../../../models/contractor';
import { useMst } from '../../../setup/root';
import { LoadingScreen } from '../../shared/base/loading-screen';
import { SharedSpinner } from '../../shared/base/shared-spinner';
import { SearchGrid } from '../../shared/grid/search-grid';
import { RouterLinkButton } from '../../shared/navigation/router-link-button';
import { ContractorGridHeaders } from './grid-header';
import { ContractorRow } from './contractor-table-rows';
import { ISearch } from '../../../lib/create-search-model';
import { Paginator } from '../../shared/base/inputs/paginator';
import { PerPageSelect } from '../../shared/base/inputs/per-page-select';

export const ContractorManagementScreen = observer(function ContractorManagement() {
  const { t } = useTranslation();
  const { contractorStore } = useMst();
  const [tabIndex, setTabIndex] = useState(0);

  const { isSearching } = contractorStore;

  useSearch(contractorStore as ISearch, []);

  const selectedTabStyles = {
    color: 'theme.blue',
    borderBottomColor: 'theme.blue',
    borderBottomWidth: '2px',
  };

  const handleSetTabIndex = (index: number) => {
    setTabIndex(index);
    // Here you can add logic to filter contractors based on status
    // const statusMap = ['active', 'suspended', 'removed'] as const;
    // contractorStore.setStatus(statusMap[index]);
  };

  return (
    <Container maxW="container.lg" p={8} as={'main'}>
      <VStack alignItems={'flex-start'} spacing={5} w={'full'} h={'full'}>
        <Box>
          <Heading as="h1" color={'theme.blueAlt'}>
            {t('contractor.management.title', 'Manage contractor details')}
          </Heading>
        </Box>
        <Flex
          as={Tabs}
          direction="column"
          position="sticky"
          zIndex={1}
          maxWidth={'100%'}
          index={tabIndex}
          // onChange={(index: number) => handleSetTabIndex(index)}
        >
          <TabList borderBottom="0px solid" borderColor="border.dark" mt={4}>
            <Tab ml={4} _selected={selectedTabStyles}>
              {t('contractor.tabs.active', 'Active')}
            </Tab>
            <Tab ml={4} _selected={selectedTabStyles}>
              {t('contractor.tabs.suspended', 'Suspended')}
            </Tab>
            <Tab ml={4} _selected={selectedTabStyles}>
              {t('contractor.tabs.removed', 'Removed')}
            </Tab>
          </TabList>
          <TabPanels as={Flex} direction="column" flex={1} overflowY="auto">
            <TabPanel flex={1}>
              <SearchGrid templateColumns="1fr 1fr 1fr 1fr 1fr 1fr 120px">
                <ContractorGridHeaders />
                {isSearching ? (
                  <Flex py="50" gridColumn={'span 7'}>
                    <SharedSpinner />
                  </Flex>
                ) : contractorStore.tableContractors.length === 0 ? (
                  <Flex py="50" gridColumn={'span 7'} justifyContent="center">
                    <Text color="gray.500" fontSize="md">
                      {t('errors.noResults')}
                    </Text>
                  </Flex>
                ) : (
                  contractorStore.tableContractors.map((contractor: IContractor) => {
                    return <ContractorRow key={contractor.id} contractor={contractor} />;
                  })
                )}
              </SearchGrid>
              <TableControls contractorStore={contractorStore} />
            </TabPanel>
            <TabPanel flex={1}>
              <SearchGrid templateColumns="1fr 1fr 1fr 1fr 1fr 1fr 120px">
                <ContractorGridHeaders />
                {isSearching ? (
                  <Flex py="50" gridColumn={'span 7'}>
                    <SharedSpinner />
                  </Flex>
                ) : contractorStore.tableContractors.length === 0 ? (
                  <Flex py="50" gridColumn={'span 7'} justifyContent="center">
                    <Text color="gray.500" fontSize="md">
                      {t('errors.noResults')}
                    </Text>
                  </Flex>
                ) : (
                  contractorStore.tableContractors.map((contractor: IContractor) => {
                    return <ContractorRow key={contractor.id} contractor={contractor} />;
                  })
                )}
              </SearchGrid>
              <TableControls contractorStore={contractorStore} />
            </TabPanel>
            <TabPanel flex={1}>
              <SearchGrid templateColumns="1fr 1fr 1fr 1fr 1fr 1fr 120px">
                <ContractorGridHeaders />
                {isSearching ? (
                  <Flex py="50" gridColumn={'span 7'}>
                    <SharedSpinner />
                  </Flex>
                ) : contractorStore.tableContractors.length === 0 ? (
                  <Flex py="50" gridColumn={'span 7'} justifyContent="center">
                    <Text color="gray.500" fontSize="md">
                      {t('errors.noResults')}
                    </Text>
                  </Flex>
                ) : (
                  contractorStore.tableContractors.map((contractor: IContractor) => {
                    return <ContractorRow key={contractor.id} contractor={contractor} />;
                  })
                )}
              </SearchGrid>
              <TableControls contractorStore={contractorStore} />
            </TabPanel>
          </TabPanels>
        </Flex>
      </VStack>
    </Container>
  );
});

const TableControls = ({ contractorStore }) => {
  const { currentPage, totalPages, totalCount, countPerPage, handleCountPerPageChange, handlePageChange } =
    contractorStore;

  return (
    <Flex w={'full'} justifyContent={'space-between'} mt={2} p={4}>
      <PerPageSelect
        handleCountPerPageChange={handleCountPerPageChange}
        countPerPage={countPerPage}
        totalCount={totalCount}
      />
      <Paginator
        current={currentPage}
        total={totalCount}
        totalPages={totalPages}
        pageSize={countPerPage}
        handlePageChange={handlePageChange}
        showLessItems={true}
      />
    </Flex>
  );
};
