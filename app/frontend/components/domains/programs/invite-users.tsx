import { Box, Container, Flex, Heading, VStack, Text, Button } from '@chakra-ui/react';
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
  const [rows, setRows] = useState<TInviteUserParams[]>([{ ...defaultRow }]);

  if (error) return <ErrorScreen error={error} />;
  if (!currentProgram) return <LoadingScreen />;

  const handleSendInvites = async () => {
    try {
      const apiRows = rows.map((row) => ({
        email: row.email,
        role: row.role,
        inbox_access: formatInboxAccessForApi(row.inboxAccess as ClassificationPresetName[]),
      }));

      console.log(apiRows);

      const result = await currentProgram.inviteUsers(apiRows);

      uiStore.flashMessage.show(
        EFlashMessageStatus.success,
        'Invite sent. Review the status of the invite in the user table.',
        '',
      );
    } catch (error) {
      console.error('Failed to send invites:', error);

      uiStore.flashMessage.show(EFlashMessageStatus.error, 'Failed to send invite', '');
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

      <InviteUserTable rows={rows} setRows={setRows} defaultRow={defaultRow} />

      <Flex gap={4} pt={3}>
        <Button
          onClick={handleSendInvites}
          variant={'primary'}
          alignSelf="flex-start"
          rightIcon={<PaperPlaneTilt size={16} />}
        >
          {t('user.sendInvites')}
        </Button>
        <RouterLinkButton variant={'secondary'} to={`/programs/${currentProgram.id}/users`}>
          {t('ui.cancel')}
        </RouterLinkButton>
      </Flex>
    </Container>
  );
});
