import { Box, Container, Flex, Heading, Tab, TabList, TabPanel, TabPanels, Tabs, Text, VStack } from '@chakra-ui/react';
import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearch } from '../../../hooks/use-search';
import { ISearch } from '../../../lib/create-search-model';
import { IContractor } from '../../../models/contractor';
import { useMst } from '../../../setup/root';
import { Paginator } from '../../shared/base/inputs/paginator';
import { PerPageSelect } from '../../shared/base/inputs/per-page-select';
import { SharedSpinner } from '../../shared/base/shared-spinner';
import { SearchGrid } from '../../shared/grid/search-grid';
import { ContractorRow } from './contractor-table-rows';
import { ContractorGridHeaders } from './grid-header';

export const ContractorManagementScreen = observer(function ContractorManagement() {
  const { t } = useTranslation();
  const { contractorStore } = useMst();
  // BCHEP-737: "Removed" tab retired from the UI (data retained in DB / store).
  // Partial-typed so a stale 'removed' statusFilter still compiles and falls back to the Active tab (?? 0).
  const statusToIndex: Partial<Record<'active' | 'suspended' | 'removed', number>> = { active: 0, suspended: 1 };
  const [tabIndex, setTabIndex] = useState(statusToIndex[contractorStore.statusFilter] ?? 0);

  const { isSearching } = contractorStore;

  useSearch(contractorStore as ISearch, []);

  const selectedTabStyles = {
    color: 'theme.blue',
    borderBottomColor: 'theme.darkBlue',
    borderBottomWidth: '3px',
  };

  const handleSetTabIndex = (index: number) => {
    setTabIndex(index);
    const statusMap = ['active', 'suspended'] as const;
    contractorStore.setStatusFilter(statusMap[index]);
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
            >
              {t('contractor.tabs.suspended', 'Suspended')}
            </Tab>
          </TabList>
          <TabPanels as={Flex} direction="column" flex={1} overflowY="auto">
            {/* Active contractors tab */}
            <TabPanel flex={1} px={0}>
              <SearchGrid templateColumns="1fr 1.5fr 1fr 1fr 1fr 120px">
                <ContractorGridHeaders status="active" />
                {isSearching ? (
                  <Flex py="50" gridColumn={'span 6'}>
                    <SharedSpinner />
                  </Flex>
                ) : contractorStore.tableContractors.length === 0 ? (
                  <Flex py="50" gridColumn={'span 6'} justifyContent="center">
                    <Text color="gray.500" fontSize="md">
                      {t('errors.noResults')}
                    </Text>
                  </Flex>
                ) : (
                  contractorStore.tableContractors.map((contractor: IContractor) => {
                    return <ContractorRow key={contractor.id} contractor={contractor} status="active" />;
                  })
                )}
              </SearchGrid>
              <TableControls contractorStore={contractorStore} />
            </TabPanel>
            {/* Suspended contractors tab */}
            <TabPanel flex={1} px={0}>
              <SearchGrid templateColumns="1fr 1fr 1.2fr 1fr 1fr 120px">
                <ContractorGridHeaders status="suspended" />
                {isSearching ? (
                  <Flex py="50" gridColumn={'span 6'}>
                    <SharedSpinner />
                  </Flex>
                ) : contractorStore.tableContractors.length === 0 ? (
                  <Flex py="50" gridColumn={'span 6'} justifyContent="center">
                    <Text color="gray.500" fontSize="md">
                      {t('errors.noResults')}
                    </Text>
                  </Flex>
                ) : (
                  contractorStore.tableContractors.map((contractor: IContractor) => {
                    return <ContractorRow key={contractor.id} contractor={contractor} status="suspended" />;
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
