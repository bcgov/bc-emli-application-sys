import React from 'react';
import { Box, FormControl, FormLabel, FormErrorMessage, HStack, IconButton, Input, Link, Select, VStack, Text, Tag, TagProps, Spinner } from '@chakra-ui/react';
import { ClassificationPresetName, classificationPresets } from '../../../models/program-classification';
import { MultiCheckSelect } from '../select/multi-check-select';
import { Trash, CheckCircle, WarningCircle } from '@phosphor-icons/react';
import { EUserRoles } from '../../../types/enums';
import { toTitleCase } from '../../../utils/utility-functions';
import { TInviteUserParams } from '../../../types/types';
import { useMst } from '../../../setup/root';
import { useTranslation } from 'react-i18next';

const inboxOptions = Object.keys(classificationPresets).map((label) => ({
  label,
  value: label as ClassificationPresetName,
}));

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export interface InviteUserTableProps {
  rows: TInviteUserParams[];
  setRows: React.Dispatch<React.SetStateAction<TInviteUserParams[]>>;
  defaultRow: TInviteUserParams;
  invitationResponse?: any;
  isSubmitting?: boolean;
}

export const InviteUserTable: React.FC<InviteUserTableProps> = ({
  rows,
  setRows,
  defaultRow,
  invitationResponse,
  isSubmitting = false,
}) => {
  const { userStore } = useMst();
  const currentUser = userStore.currentUser;
  const { t } = useTranslation();

  const assignableRoles = currentUser.isAdminManager
    ? [EUserRoles.adminManager, EUserRoles.admin]
    : [EUserRoles.adminManager, EUserRoles.admin, EUserRoles.systemAdmin];

  const handleChange = (index, field, value) => {
    const updated = [...rows];
    updated[index][field] = value;
    setRows(updated);
  };

  const handleRemove = (index) => {
    setRows(rows.filter((_, i) => i !== index));
  };

  const handleAddRow = () => {
    setRows([...rows, { ...defaultRow }]);
  };

  // Helper functions to check email status (use camelCase!)
  const isEmailInvited = (email: string) =>
    invitationResponse?.invited?.some((user: any) => user.email.toLowerCase() === email.toLowerCase()) || false;

  const isEmailReinvited = (email: string) =>
    invitationResponse?.reinvited?.some((user: any) => user.email.toLowerCase() === email.toLowerCase()) || false;

  const isEmailTakenActive = (email: string) =>
    invitationResponse?.emailTakenActive?.some((user: any) => user.email.toLowerCase() === email.toLowerCase()) ||
    false;

  const isEmailTakenDeactivated = (email: string) =>
    invitationResponse?.emailTakenDeactivated?.some((user: any) => user.email.toLowerCase() === email.toLowerCase()) ||
    false;

  return (
    <VStack spacing={5} align="stretch">
      {rows.map((row, index) => {
        const hasValidationError = row.email !== '' && !isValidEmail(row.email);
        const invited = isEmailInvited(row.email);
        const reinvited = isEmailReinvited(row.email);
        const takenActive = isEmailTakenActive(row.email);
        const takenDeactivated = isEmailTakenDeactivated(row.email);

        return (
          <Box key={index} borderWidth="1px" borderRadius="md" p={4} bg="greys.grey10">
            <HStack spacing={4} align="start" width="100%">
              <FormControl isInvalid={hasValidationError}>
                <FormLabel>Email Address</FormLabel>
                <Input
                  bg={'white'}
                  type="email"
                  value={row.email}
                  onChange={(e) => handleChange(index, 'email', e.target.value)}
                />
              </FormControl>

            <FormControl>
              <FormLabel>Select role</FormLabel>
              <Select
                bg="white"
                placeholder=" "
                value={row.role}
                onChange={(e) => handleChange(index, 'role', e.target.value as EUserRoles)}
              >
                {assignableRoles.map((role) => (
                  <option key={role} value={role}>
                    {toTitleCase(role)}
                  </option>
                ))}
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel>Select submission inbox access</FormLabel>
              <MultiCheckSelect
                selectedValues={row.inboxAccess}
                setSelectedValues={(newValues) => handleChange(index, 'inboxAccess', newValues)}
                allItems={inboxOptions}
              />
            </FormControl>

            <Box alignSelf="flex-end" minW={150}>
              {isSubmitting ? (
                <Spinner size="sm" color="theme.blue" mt={2} />
              ) : (
                <>
                  {reinvited && (
                    <InviteResultTag
                      bg="semantic.successLight"
                      text={t('user.reinviteSuccess')}
                      icon={<CheckCircle size={20} />}
                    />
                  )}
                  {invited && (
                    <InviteResultTag
                      bg="semantic.successLight"
                      text={t('user.inviteSuccess')}
                      icon={<CheckCircle size={20} />}
                    />
                  )}
                  {!invited && !reinvited && !isSubmitting && (
                    <IconButton
                      aria-label="Remove"
                      icon={<Trash size={20} />}
                      onClick={() => handleRemove(index)}
                      colorScheme="red"
                      variant="ghost"
                    />
                  )}
                </>
              )}
            </Box>
          </HStack>
        </Box>
        );
      })}
      <Link onClick={handleAddRow} color="blue.500" fontWeight="normal" cursor="pointer" alignSelf="flex-start">
        + Add more emails
      </Link>
    </VStack>
  );
};

// Inline status tag component
interface IInviteResultTagProps extends TagProps {
  icon: React.ReactNode;
  text: string;
}

const InviteResultTag = ({ bg, icon, text, ...rest }: IInviteResultTagProps) => {
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
