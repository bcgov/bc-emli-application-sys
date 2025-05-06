import { Box, Container, Flex, Heading, Tab, Tabs, TabList, TabPanel, TabPanels, VStack } from '@chakra-ui/react';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useProgram } from '../../../../hooks/resources/use-program';
import { useSearch } from '../../../../hooks/use-search';
import { IUser } from '../../../../models/user';
import { useMst } from '../../../../setup/root';
import { ErrorScreen } from '../../../shared/base/error-screen';
import { Paginator } from '../../../shared/base/inputs/paginator';
import { PerPageSelect } from '../../../shared/base/inputs/per-page-select';
import { LoadingScreen } from '../../../shared/base/loading-screen';
import { SharedSpinner } from '../../../shared/base/shared-spinner';
import { SearchGrid } from '../../../shared/grid/search-grid';
import { RouterLinkButton } from '../../../shared/navigation/router-link-button';
import { ActiveGridHeaders, DeactivatedGridHeaders, PendingGridHeaders } from './grid-header';
import { ActiveUserRow, DeactivatedUserRow, PendingUserRow } from './user-table-rows';
import { ISearch } from '../../../../lib/create-search-model';

export const ProgramUserIndexScreen = observer(function ProgramUserIndex() {
  const { t } = useTranslation();
  const { userStore } = useMst();
  const { currentProgram, error } = useProgram();
  const [tabIndex, setTabIndex] = useState(0);

  useEffect(() => {
    setTabIndex(0);
    userStore.setStatus('active');
  }, []);

  const handleSetTabIndex = (index: number) => {
    setTabIndex(index);

    const statusMap = ['active', 'pending', 'deactivated'] as const;
    const newStatus = statusMap[index];

    userStore.setStatus(newStatus);
  };

  const { isSearching, showArchived } = userStore;

  const selectedTabStyles = {
    borderLeft: '0px Solid',
    borderRight: '0px Solid',
    borderTop: '0px solid',
    borderBottom: '4px solid',
    borderColor: 'border.dark',
    borderLeftColor: 'border.dark',
    borderBottomColor: 'theme.black',
    borderRadius: 0,
  };

  useSearch(userStore as ISearch, [currentProgram?.id, showArchived]);

  if (error) return <ErrorScreen error={error} />;
  if (!currentProgram) return <LoadingScreen />;

  return (
    <Container maxW="container.lg" p={8} as={'main'}>
      <VStack alignItems={'flex-start'} spacing={5} w={'full'} h={'full'}>
        <Flex justifyContent={'space-between'} w={'full'} alignItems={'flex-end'}>
          <Box>
            <Heading as="h1" color={'theme.blueAlt'}>
              {`${currentProgram?.programName} users`}
            </Heading>
          </Box>
          <RouterLinkButton alignSelf="flex-end" to={`/programs/${currentProgram?.id}/invite`}>
            {t('user.index.inviteButton')}
          </RouterLinkButton>
        </Flex>
        <Flex
          as={Tabs}
          direction="column"
          position="sticky"
          bottom="0"
          maxWidth={'100%'}
          id="permit-revision-sidebar"
          index={tabIndex}
          // @ts-ignore
          onChange={(index: number) => handleSetTabIndex(index)}
        >
          <TabList borderBottom="0px solid" borderColor="border.dark" mt={4}>
            <Tab ml={4} _selected={selectedTabStyles}>
              Active
            </Tab>
            <Tab ml={4} _selected={selectedTabStyles}>
              Pending
            </Tab>
            <Tab ml={4} _selected={selectedTabStyles}>
              Deactivated
            </Tab>
          </TabList>
          <TabPanels as={Flex} direction="column" flex={1} overflowY="auto">
            <TabPanel flex={1}>
              <SearchGrid templateColumns="160px 2fr repeat(4, 1fr)">
                <ActiveGridHeaders />
                {isSearching ? (
                  <Flex py="50" gridColumn={'span 7'}>
                    <SharedSpinner />
                  </Flex>
                ) : (
                  userStore.tableUsers.map((u: IUser) => {
                    return <ActiveUserRow key={u.id} user={u} userStore={userStore} />;
                  })
                )}
              </SearchGrid>
              <TableControls userStore={userStore} />
            </TabPanel>
            <TabPanel flex={2}>
              <SearchGrid templateColumns="2fr 1fr repeat(5, 1fr)">
                <PendingGridHeaders />
                {isSearching ? (
                  <Flex py="50" gridColumn={'span 7'}>
                    <SharedSpinner />
                  </Flex>
                ) : (
                  userStore.tableUsers.map((u: IUser) => {
                    return <PendingUserRow key={u.id} user={u} userStore={userStore} />;
                  })
                )}
              </SearchGrid>
              <TableControls userStore={userStore} />
            </TabPanel>
            <TabPanel flex={2}>
              <SearchGrid templateColumns="2fr 1fr repeat(5, 1fr)">
                <DeactivatedGridHeaders />
                {isSearching ? (
                  <Flex py="50" gridColumn={'span 7'}>
                    <SharedSpinner />
                  </Flex>
                ) : (
                  userStore.tableUsers.map((u: IUser) => {
                    return <DeactivatedUserRow key={u.id} user={u} userStore={userStore} />;
                  })
                )}
              </SearchGrid>
              <TableControls userStore={userStore} />
            </TabPanel>
          </TabPanels>
        </Flex>
        {/* <ToggleArchivedButton searchModel={userStore} mt={3} /> */}
      </VStack>
    </Container>
  );
});

const TableControls = ({ userStore }) => {
  const { currentPage, totalPages, totalCount, countPerPage, handleCountPerPageChange, handlePageChange } = userStore;

  return (
    <Flex w={'full'} justifyContent={'space-between'}>
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
