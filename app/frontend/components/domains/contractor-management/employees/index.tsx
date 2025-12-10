import { Box, Container, Flex, Heading, Tab, Tabs, TabList, TabPanel, TabPanels, VStack, Text } from '@chakra-ui/react';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useContractor } from '../../../../hooks/resources/use-contractor';
import { useSearch } from '../../../../hooks/use-search';
import { IUser } from '../../../../models/user';
import { useMst } from '../../../../setup/root';
import { ErrorScreen } from '../../../shared/base/error-screen';
import { Paginator } from '../../../shared/base/inputs/paginator';
import { PerPageSelect } from '../../../shared/base/inputs/per-page-select';
import { LoadingScreen } from '../../../shared/base/loading-screen';
import { SharedSpinner } from '../../../shared/base/shared-spinner';
import { SearchGrid } from '../../../shared/grid/search-grid';
import { SimpleEmployeeGridHeaders } from './simple-grid-headers';
import { SimpleEmployeeRow } from './simple-employee-rows';
import { ISearch } from '../../../../lib/create-search-model';
import { useSearchParams } from 'react-router-dom';

export const ContractorEmployeeIndexScreen = observer(function ContractorEmployeeIndex() {
  const { t } = useTranslation();
  const { userStore } = useMst();
  const { currentContractor, error } = useContractor();
  const [searchParams] = useSearchParams();

  // Get initial tab index from URL params
  const getInitialTabIndex = () => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'pending') return 1;
    if (tabParam === 'deactivated') return 2;
    return 0; // default to active
  };

  const [tabIndex, setTabIndex] = useState(getInitialTabIndex);

  useEffect(() => {
    const newTabIndex = getInitialTabIndex();
    setTabIndex(newTabIndex);

    const statusMap = ['active', 'pending', 'deactivated'] as const;
    const newStatus = statusMap[newTabIndex];
    userStore.setStatusWithoutSearch(newStatus);
  }, [searchParams]);

  const handleSetTabIndex = (index: number) => {
    setTabIndex(index);

    const statusMap = ['active', 'pending', 'deactivated'] as const;
    const newStatus = statusMap[index];

    userStore.setStatusWithoutSearch(newStatus);
  };

  const { isSearching, showArchived } = userStore;

  const selectedTabStyles = {
    borderLeft: '0px Solid',
    borderRight: '0px Solid',
    borderTop: '0px solid',
    borderBottom: '3px solid',
    borderColor: 'border.dark',
    borderLeftColor: 'border.dark',
    borderBottomColor: 'theme.darkBlue',
    borderRadius: 0,
  };

  useSearch(userStore as ISearch, [currentContractor?.id, showArchived, userStore.status]);

  if (error) return <ErrorScreen error={error} />;
  if (!currentContractor) return <LoadingScreen />;

  return (
    <Container maxW="container.lg" p={8} as={'main'}>
      <VStack alignItems={'flex-start'} spacing={5} w={'full'} h={'full'}>
        <Box>
          <Heading as="h1" color={'theme.blueAlt'}>
            {t('contractor.employees.viewEmployees')}
          </Heading>
          <Text color="text.secondary" fontSize="md" mt={2}>
            {t('contractor.employees.description')}
          </Text>
        </Box>

        {/* Contractor Name */}
        <Box>
          <Heading as="h2" size="md" color="gray.800">
            {currentContractor?.businessName || t('contractor.employees.unknownContractor')}
          </Heading>
        </Box>

        <Tabs
          index={tabIndex}
          onChange={(index: number) => handleSetTabIndex(index)}
          aria-label={t('contractor.employees.tabs.ariaLabel')}
        >
          <TabList
            borderBottom="0px solid"
            borderColor="border.dark"
            mt={4}
            pl={0}
            role="tablist"
            aria-label={t('contractor.employees.tabs.listAriaLabel')}
          >
            <Tab
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
              role="tab"
              aria-selected={tabIndex === 0}
              aria-controls="active-tabpanel"
              id="active-tab"
            >
              {t('contractor.employees.tabs.active')}
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
              role="tab"
              aria-selected={tabIndex === 1}
              aria-controls="pending-tabpanel"
              id="pending-tab"
            >
              {t('contractor.employees.tabs.pending')}
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
              role="tab"
              aria-selected={tabIndex === 2}
              aria-controls="deactivated-tabpanel"
              id="deactivated-tab"
            >
              {t('contractor.employees.tabs.deactivated')}
            </Tab>
          </TabList>

          <TabPanels>
            <TabPanel
              p={0}
              role="tabpanel"
              aria-labelledby="active-tab"
              id="active-tabpanel"
              tabIndex={tabIndex === 0 ? 0 : -1}
            >
              <SearchGrid templateColumns="1fr 2fr 1fr 1fr" minW="1138px" alignSelf="flex-start" mt={4}>
                <SimpleEmployeeGridHeaders />
                {isSearching ? (
                  <Flex py="50" gridColumn={'span 4'} aria-live="polite" aria-label={t('contractor.employees.loading')}>
                    <SharedSpinner />
                  </Flex>
                ) : (
                  userStore.tableUsers.map((u: IUser) => {
                    return <SimpleEmployeeRow key={u.id} user={u} userStore={userStore} />;
                  })
                )}
              </SearchGrid>
            </TabPanel>

            <TabPanel
              p={0}
              role="tabpanel"
              aria-labelledby="pending-tab"
              id="pending-tabpanel"
              tabIndex={tabIndex === 1 ? 0 : -1}
            >
              <SearchGrid templateColumns="1fr 2fr 1fr 1fr" minW="1138px" alignSelf="flex-start" mt={4}>
                <SimpleEmployeeGridHeaders />
                {isSearching ? (
                  <Flex py="50" gridColumn={'span 4'} aria-live="polite" aria-label={t('contractor.employees.loading')}>
                    <SharedSpinner />
                  </Flex>
                ) : (
                  userStore.tableUsers.map((u: IUser) => {
                    return <SimpleEmployeeRow key={u.id} user={u} userStore={userStore} />;
                  })
                )}
              </SearchGrid>
            </TabPanel>

            <TabPanel
              p={0}
              role="tabpanel"
              aria-labelledby="deactivated-tab"
              id="deactivated-tabpanel"
              tabIndex={tabIndex === 2 ? 0 : -1}
            >
              <SearchGrid templateColumns="1fr 2fr 1fr 1fr" minW="1138px" alignSelf="flex-start" mt={4}>
                <SimpleEmployeeGridHeaders />
                {isSearching ? (
                  <Flex py="50" gridColumn={'span 4'} aria-live="polite" aria-label={t('contractor.employees.loading')}>
                    <SharedSpinner />
                  </Flex>
                ) : (
                  userStore.tableUsers.map((u: IUser) => {
                    return <SimpleEmployeeRow key={u.id} user={u} userStore={userStore} />;
                  })
                )}
              </SearchGrid>
            </TabPanel>
          </TabPanels>
        </Tabs>

        <TableControls userStore={userStore} />
      </VStack>
    </Container>
  );
});

interface ITableControlsProps {
  userStore: ISearch;
}

const TableControls = ({ userStore }: ITableControlsProps) => {
  const { currentPage, totalPages, totalCount, countPerPage, handleCountPerPageChange, handlePageChange } = userStore;

  return (
    <Flex w={'full'} justifyContent={'space-between'} mt={4}>
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
