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
  const { reinvitedEmails, invitedEmails, takenEmails } = userStore;
  const reinvited = reinvitedEmails?.includes(emailWatch);
  const invited = invitedEmails?.includes(emailWatch);
  const taken = takenEmails?.includes(emailWatch);

  return (
    <Flex bg="greys.grey03" p={4} borderRadius="md" flexWrap="wrap">
      <HStack spacing={4} w="full">
        <EmailFormControl fieldName={`users.${index}.email`} validate required />
        <TextFormControl label="Name" fieldName={`users.${index}.name`} required />
        <Box alignSelf="flex-end" minW={150}>
          {isSubmitting ? (
            <SharedSpinner position="relative" top={4} left={5} minW="fit-content" />
          ) : (
            <>
              {reinvited && (
                <IInviteResultTag
                  bg="semantic.successLight"
                  text={t('user.reinviteSuccess')}
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
              {taken && (
                <IInviteResultTag
                  bg="semantic.errorLight"
                  text={t('user.inviteError')}
                  icon={<WarningCircle size={20} />}
                />
              )}
            </>
          )}
          {!invited && !taken && !reinvited && remove && !isSubmitting && (
            <Button
              onClick={() => remove(index)}
              variant="tertiary"
              leftIcon={<Trash size={16} color="red" />}
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
      noOfLines={1}
      bg={bg}
      color={color}
      display="flex"
      alignItems="center"
      gap={2}
      {...rest}
    >
      {icon}
      <Text>{text}</Text>
    </Tag>
  );
};
