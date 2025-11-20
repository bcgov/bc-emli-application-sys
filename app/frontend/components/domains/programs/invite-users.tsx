import { Box, Container, Flex, Heading, VStack, Text, Button, Spinner } from '@chakra-ui/react';
import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { useProgram } from '../../../hooks/resources/use-program';
import { ErrorScreen } from '../../shared/base/error-screen';
import { LoadingScreen } from '../../shared/base/loading-screen';
import { InviteUserTable } from '../../shared/user/invite-user-table';
import { PaperPlaneTilt } from '@phosphor-icons/react';
import { TInviteUserParams } from '../../../types/types';
import { ClassificationPresetName, classificationPresets } from '../../../models/program-classification';
import { EFlashMessageStatus, EPermitClassificationCode } from '../../../types/enums';
import { RouterLink } from '../../shared/navigation/router-link';
import { RouterLinkButton } from '../../shared/navigation/router-link-button';
import { useMst } from '../../../setup/root';
import { useLocation } from 'react-router-dom';
import { CustomMessageBox } from '../../shared/base/custom-message-box';

const defaultRow: TInviteUserParams = {
  email: '',
  role: '',
  inboxAccess: [] as ClassificationPresetName[],
};

const formatInboxAccessForApi = (
  selectedPresets: ClassificationPresetName[],
): { user_group_type: EPermitClassificationCode; submission_type: EPermitClassificationCode | null }[] => {
  return selectedPresets.map((presetName) => {
    const preset = classificationPresets[presetName];
    return {
      user_group_type: preset.userGroupType,
      submission_type: preset.submissionType,
    };
  });
};

export const ProgramInviteUserScreen = observer(function ProgramInviteUser() {
  const { t } = useTranslation();
  const { currentProgram, error } = useProgram();
  const rootStore = useMst();
  const { uiStore } = rootStore;
  const location = useLocation();

  const [rows, setRows] = useState<TInviteUserParams[]>([{ ...defaultRow }]);
  const [invitationResponse, setInvitationResponse] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const basePath = location.pathname.startsWith('/configure-users') ? '/configure-users' : '/programs';

  if (error) return <ErrorScreen error={error} />;
  if (!currentProgram) return <LoadingScreen />;

  const handleSendInvites = async () => {
    try {
      setIsSubmitting(true);
      setInvitationResponse(null);

      const apiRows = rows.map((row) => ({
        email: row.email,
        role: row.role,
        inbox_access: formatInboxAccessForApi(row.inboxAccess as ClassificationPresetName[]),
      }));

      const response = await currentProgram.inviteUsers(apiRows);

      // Store the response data for displaying inline status tags
      const responseData = response?.data || response;
      setInvitationResponse(responseData);

      // Check the response categories (use camelCase!)
      const invited = responseData?.invited || [];
      const reinvited = responseData?.reinvited || [];
      const emailTakenActive = responseData?.emailTakenActive || [];
      const emailTakenDeactivated = responseData?.emailTakenDeactivated || [];

      // Show success message only for newly invited users (not existing users assigned to program)
      if (invited.length > 0) {
        uiStore.flashMessage.show(
          EFlashMessageStatus.success,
          t('user.inviteSentSuccess', {
            count: invited.length,
          }),
          '',
        );
      }
    } catch (error) {
      console.error('Failed to send invites:', error);
      uiStore.flashMessage.show(EFlashMessageStatus.error, 'Failed to send invite', '');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container maxW="container.lg" p={8} as={'main'}>
      <VStack alignItems={'flex-start'} spacing={5} w={'full'} h={'full'}>
        <Flex justifyContent={'space-between'} w={'full'} alignItems={'flex-end'}>
          <Box>
            <Heading as="h1" color={'theme.blueAlt'}>
              {t('user.inviteTitle')}
            </Heading>
            <Text color={'text.secondary'}>
              <Trans i18nKey={'user.inviteInstructions'} components={{ a: <RouterLink to={'#'} /> }} />
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

      {invitationResponse && (invitationResponse.emailTakenActive?.length > 0 || invitationResponse.emailTakenDeactivated?.length > 0) && (
        <CustomMessageBox
          status="warning"
          title={t('user.takenErrorTitle')}
          description={
            <VStack align="start" spacing={1}>
              {invitationResponse.emailTakenActive?.map((user: any) => (
                <Text key={user.email}>
                  {user.email} - {t('user.inviteAlreadyActive')}
                </Text>
              ))}
              {invitationResponse.emailTakenDeactivated?.map((user: any) => (
                <Text key={user.email}>
                  {user.email} - {t('user.inviteAlreadyDeactivated')}
                </Text>
              ))}
            </VStack>
          }
        />
      )}

      <InviteUserTable
        rows={rows}
        setRows={setRows}
        defaultRow={defaultRow}
        invitationResponse={invitationResponse}
        isSubmitting={isSubmitting}
      />

      <Flex gap={4} pt={3}>
        <Button
          onClick={handleSendInvites}
          variant={'primary'}
          alignSelf="flex-start"
          rightIcon={<PaperPlaneTilt size={16} />}
          isLoading={isSubmitting}
          loadingText={t('user.sendInvites')}
        >
          {t('user.sendInvites')}
        </Button>
        <RouterLinkButton variant={'secondary'} to={`${basePath}/${currentProgram.id}/users`}>
          {t('ui.cancel')}
        </RouterLinkButton>
      </Flex>
    </Container>
  );
});
