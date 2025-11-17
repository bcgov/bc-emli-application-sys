import { Box, Container, Flex, Heading, Tab, Tabs, TabList, TabPanel, TabPanels, VStack, Text } from '@chakra-ui/react';
import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearch } from '../../../hooks/use-search';
import { IContractor } from '../../../models/contractor';
import { useMst } from '../../../setup/root';
import { SharedSpinner } from '../../shared/base/shared-spinner';
import { SearchGrid } from '../../shared/grid/search-grid';
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
    borderBottomColor: 'theme.darkBlue',
    borderBottomWidth: '3px',
  };

  const handleSetTabIndex = (index: number) => {
    setTabIndex(index);
    // TODO: Implement status filtering when backend support is added
    // const statusMap = ['active', 'suspended', 'removed'] as const;
    // contractorStore.setStatusFilter(statusMap[index]);
  };

  return (
    <Container maxW="container.lg" p={8} as={'main'}>
      <VStack alignItems={'flex-start'} spacing={5} w={'full'} h={'full'}>
        <Box>
          <Heading as="h1" color={'theme.blueAlt'}>
            {t('contractor.management.title', 'Manage contractor details')}
          </Heading>
        </Box>
        <Tabs index={tabIndex} onChange={handleSetTabIndex} variant="unstyled">
          <TabList borderBottom="0px solid" borderColor="border.dark" mt={4}>
            <Tab
              ml={4}
              pr={4}
              position="relative"
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
              _active={{
                outline: 'none',
                boxShadow: 'none',
              }}
              _after={{
                content: '""',
                position: 'absolute',
                right: 0,
                top: '50%',
                transform: 'translateY(-50%)',
                height: '16px',
                width: '1px',
                bg: 'gray.300',
              }}
            >
              {t('contractor.tabs.active', 'Active')}
            </Tab>
            <Tab
              pl={4}
              pr={4}
              position="relative"
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
              _active={{
                outline: 'none',
                boxShadow: 'none',
              }}
              _after={{
                content: '""',
                position: 'absolute',
                right: 0,
                top: '50%',
                transform: 'translateY(-50%)',
                height: '16px',
                width: '1px',
                bg: 'gray.300',
              }}
            >
              {t('contractor.tabs.suspended', 'Suspended')}
            </Tab>
            <Tab
              pl={4}
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
              _active={{
                outline: 'none',
                boxShadow: 'none',
              }}
            >
              {t('contractor.tabs.removed', 'Removed')}
            </Tab>
          </TabList>
          <TabPanels as={Flex} direction="column" flex={1} overflowY="auto">
            <TabPanel flex={1} px={0}>
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
            <TabPanel flex={1} px={0}>
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
            <TabPanel flex={1} px={0}>
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
        </Tabs>
      </VStack>
    </Container>
  );
});

const TableControls = ({ contractorStore }) => {
  const { t } = useTranslation();
  const { currentPage, totalPages, totalCount, countPerPage, handleCountPerPageChange, handlePageChange } =
    contractorStore;

  return (
    <Flex
      w={'full'}
      justifyContent={'space-between'}
      mt={2}
      p={4}
      role="region"
      aria-label={t('contractor.management.tableControls', 'Table controls')}
    >
      <Box>
        <PerPageSelect
          handleCountPerPageChange={handleCountPerPageChange}
          countPerPage={countPerPage}
          totalCount={totalCount}
        />
      </Box>
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
