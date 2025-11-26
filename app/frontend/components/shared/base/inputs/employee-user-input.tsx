import { Box, Button, Flex, HStack, Tag, TagProps, Text } from '@chakra-ui/react';
import { CheckCircle, WarningCircle, Trash } from '@phosphor-icons/react';
import { observer } from 'mobx-react-lite';
import React, { ReactNode } from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useMst } from '../../../../setup/root';
import { EmailFormControl } from '../../form/email-form-control';
import { TextFormControl } from '../../form/input-form-control';
import { SharedSpinner } from '../shared-spinner';

interface IEmployeeUserInputProps {
  index: number;
  remove?: (index: number) => any;
}

export const EmployeeUserInput = observer(({ index, remove }: IEmployeeUserInputProps) => {
  const { formState, watch } = useFormContext();
  const { isSubmitting } = formState;
  const { t } = useTranslation();

  const emailWatch = watch(`users.${index}.email`);

  const { userStore } = useMst();
  const { reinvitedEmails, invitedEmails, takenActiveEmails, takenPendingEmails, takenDeactivatedEmails } = userStore;
  const reinvited = reinvitedEmails?.includes(emailWatch);
  const invited = invitedEmails?.includes(emailWatch);
  const takenActive = takenActiveEmails?.includes(emailWatch);
  const takenPending = takenPendingEmails?.includes(emailWatch);
  const takenDeactivated = takenDeactivatedEmails?.includes(emailWatch);

  return (
    <Flex bg="greys.grey03" p={4} borderRadius="md" flexWrap="wrap">
      <HStack spacing={4} w="full" alignItems="flex-start">
        <TextFormControl label="Name" fieldName={`users.${index}.name`} required flex={1} />
        <EmailFormControl fieldName={`users.${index}.email`} validate required flex={1} />
        <Box alignSelf="flex-end" minW={150}>
          {isSubmitting ? (
            <SharedSpinner position="relative" top={4} left={5} minW="fit-content" />
          ) : (
            <>
              {reinvited && (
                <IInviteResultTag
                  bg="semantic.successLight"
                  text={t('user.contractorReinviteSuccess')}
                  icon={<CheckCircle size={20} />}
                />
              )}
              {invited && (
                <IInviteResultTag
                  bg="semantic.successLight"
                  text={t('user.inviteSuccess')}
                  icon={<CheckCircle size={20} />}
                />
              )}
              {takenActive && (
                <IInviteResultTag
                  bg="semantic.errorLight"
                  text={t('user.inviteError')}
                  icon={<WarningCircle size={20} />}
                />
              )}
              {takenPending && (
                <IInviteResultTag
                  bg="semantic.errorLight"
                  text={t('user.contractorPendingError')}
                  icon={<WarningCircle size={20} />}
                />
              )}
              {takenDeactivated && (
                <IInviteResultTag
                  bg="semantic.errorLight"
                  text={t('user.contractorDeactivatedError')}
                  icon={<WarningCircle size={20} />}
                />
              )}
            </>
          )}
          {!invited && !takenActive && !takenPending && !takenDeactivated && !reinvited && remove && !isSubmitting && (
            <Button
              onClick={() => remove(index)}
              variant="tertiary"
              leftIcon={<Trash size={24} />}
              color="semantic.errorDark"
              aria-label="Remove"
            />
          )}
        </Box>
      </HStack>
    </Flex>
  );
});

interface IInviteResultTagProps extends TagProps {
  icon: ReactNode;
  text: string;
}

const IInviteResultTag = ({ bg, icon, text, ...rest }: IInviteResultTagProps) => {
  const color = (bg as string).replace(/Light/g, '');

  return (
    <Tag
      border="1px solid"
      borderColor={color}
      mb={2}
      bg={bg}
      color={color}
      display="flex"
      alignItems="flex-start"
      gap={2}
      width={280}
      whiteSpace="normal"
      height="auto"
      py={2}
      {...rest}
    >
      {icon}
      <Text whiteSpace="normal" wordBreak="break-word" noOfLines={3}>{text}</Text>
    </Tag>
  );
};
