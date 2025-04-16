import { Box, Container, Flex, Heading, Tab, Tabs, TabList, TabPanel, TabPanels, VStack } from '@chakra-ui/react';
import { format } from 'date-fns';
import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useProgram } from '../../../../hooks/resources/use-program';
import { useMountStatus } from '../../../hooks/use-mount-status';
import { useSearch } from '../../../../hooks/use-search';
import { IUser } from '../../../../models/user';
import { useMst } from '../../../../setup/root';
import { ErrorScreen } from '../../../shared/base/error-screen';
import { Paginator } from '../../../shared/base/inputs/paginator';
import { PerPageSelect } from '../../../shared/base/inputs/per-page-select';
import { LoadingScreen } from '../../../shared/base/loading-screen';
import { SharedSpinner } from '../../../shared/base/shared-spinner';
import { ToggleArchivedButton } from '../../../shared/buttons/show-archived-button';
import { SearchGrid } from '../../../shared/grid/search-grid';
import { SearchGridItem } from '../../../shared/grid/search-grid-item';
import { RouterLinkButton } from '../../../shared/navigation/router-link-button';
import { ManageUserMenu } from '../../../shared/user/manage-user-menu';
import { RoleTag } from '../../../shared/user/role-tag';
import { GridHeaders } from './grid-header';

export const ProgramUserIndexScreen = observer(function ProgramUserIndex() {
  const { t } = useTranslation();
  const { userStore } = useMst();
  const { currentProgram, error } = useProgram();
  const [tabIndex, setTabIndex] = useState(0);

  const handleSetTabIndex = (index: number) => {
    setTabIndex(index);
  };

  const {
    currentPage,
    totalPages,
    totalCount,
    countPerPage,
    handleCountPerPageChange,
    handlePageChange,
    isSearching,
    showArchived,
  } = userStore;

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

  useSearch(userStore, [currentProgram?.id, showArchived]);

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
          <RouterLinkButton alignSelf="flex-end" to={'invite'}>
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
              <SearchGrid templateColumns="160px 2fr 2fr repeat(3, 1fr)">
                <GridHeaders />
                {isSearching ? (
                  <Flex py="50" gridColumn={'span 7'}>
                    <SharedSpinner />
                  </Flex>
                ) : (
                  userStore.tableUsers.map((u: IUser) => {
                    return (
                      <Box key={u.id} className={'jurisdiction-user-index-grid-row'} role={'row'} display={'contents'}>
                        <SearchGridItem fontSize="sm" maxWidth="300px" sx={{ wordBreak: 'break-word' }}>
                          {u.name}
                        </SearchGridItem>
                        <SearchGridItem fontSize="sm">{u.email}</SearchGridItem>
                        <SearchGridItem fontWeight={700}>{<RoleTag role={u.role} />}</SearchGridItem>
                        <SearchGridItem fontWeight={700}>{''}</SearchGridItem>
                        <SearchGridItem fontSize="sm">{format(u.createdAt, 'yyyy-MM-dd')}</SearchGridItem>
                        <SearchGridItem fontSize="sm">
                          {u.lastSignInAt ? format(u.lastSignInAt, 'yyyy-MM-dd') : t('ui.never')}
                        </SearchGridItem>
                        <SearchGridItem>
                          <Flex justify="space-between" w="full">
                            <ManageUserMenu user={u} searchModel={userStore} />
                          </Flex>
                        </SearchGridItem>
                      </Box>
                    );
                  })
                )}
              </SearchGrid>
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
            </TabPanel>
            <TabPanel flex={2}>
              <SearchGrid templateColumns="160px 2fr 2fr repeat(3, 1fr)">
                <GridHeaders />
                {isSearching ? (
                  <Flex py="50" gridColumn={'span 7'}>
                    <SharedSpinner />
                  </Flex>
                ) : (
                  userStore.tableUsers.map((u: IUser) => {
                    return (
                      <Box key={u.id} className={'jurisdiction-user-index-grid-row'} role={'row'} display={'contents'}>
                        <SearchGridItem fontSize="sm" maxWidth="300px" sx={{ wordBreak: 'break-word' }}>
                          {u.name}
                        </SearchGridItem>
                        <SearchGridItem fontSize="sm">{u.email}</SearchGridItem>
                        <SearchGridItem fontWeight={700}>{<RoleTag role={u.role} />}</SearchGridItem>
                        <SearchGridItem fontWeight={700}>{''}</SearchGridItem>
                        <SearchGridItem fontSize="sm">{format(u.createdAt, 'yyyy-MM-dd')}</SearchGridItem>
                        <SearchGridItem fontSize="sm">
                          {u.lastSignInAt ? format(u.lastSignInAt, 'yyyy-MM-dd') : t('ui.never')}
                        </SearchGridItem>
                        <SearchGridItem>
                          <Flex justify="space-between" w="full">
                            <ManageUserMenu user={u} searchModel={userStore} />
                          </Flex>
                        </SearchGridItem>
                      </Box>
                    );
                  })
                )}
              </SearchGrid>
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
            </TabPanel>
          </TabPanels>
        </Flex>
        {/* <ToggleArchivedButton searchModel={userStore} mt={3} /> */}
      </VStack>
    </Container>
  );
});
