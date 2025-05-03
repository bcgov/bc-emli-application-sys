import {
  Box,
  Container,
  Flex,
  Heading,
  Tab,
  Tabs,
  TabList,
  TabPanel,
  TabPanels,
  VStack,
  Text,
  Button,
} from '@chakra-ui/react';
import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useProgram } from '../../../hooks/resources/use-program';
import { useMst } from '../../../setup/root';
import { ErrorScreen } from '../../shared/base/error-screen';
import { LoadingScreen } from '../../shared/base/loading-screen';
import { InviteUserTable } from '../../shared/user/invite-user-table';
import { PaperPlaneTilt } from '@phosphor-icons/react';

export const ProgramInviteUserScreen = observer(function ProgramInviteUser() {
  const { t } = useTranslation();
  const { userStore } = useMst();
  const { currentProgram, error } = useProgram();

  if (error) return <ErrorScreen error={error} />;
  if (!currentProgram) return <LoadingScreen />;

  return (
    <Container maxW="container.lg" p={8} as={'main'}>
      <VStack alignItems={'flex-start'} spacing={5} w={'full'} h={'full'}>
        <Flex justifyContent={'space-between'} w={'full'} alignItems={'flex-end'}>
          <Box>
            <Heading as="h1" color={'theme.blueAlt'}>
              {`Invite users`}
            </Heading>
            <Text color={'text.secondary'}>
              Enter the email addresses of whom you wish to invite below. For details about permissions for each role,
              please see <u>User Roles & Permissions</u>
            </Text>
          </Box>
        </Flex>
        <Flex pb={10}>
          <Box>
            <Heading as="h2" color={'theme.black'}>
              {currentProgram?.programName}
            </Heading>
          </Box>
        </Flex>
      </VStack>

      <InviteUserTable />

      <Flex gap={4} pt={3}>
        <Button
          onClick={() => {
            console.log('finished');
          }}
          variant={'primary'}
          alignSelf="flex-start"
          rightIcon={<PaperPlaneTilt size={16} />}
        >
          Send Invites
        </Button>
        <Button
          onClick={() => {
            console.log('Cancel');
          }}
          variant={'secondary'}
          alignSelf="flex-start"
        >
          Cancel
        </Button>
      </Flex>
    </Container>
  );
});
