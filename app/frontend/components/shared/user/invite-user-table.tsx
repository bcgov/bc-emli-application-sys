import React, { useState } from 'react';
import { Box, Button, FormControl, FormLabel, HStack, IconButton, Input, Link, Select, VStack } from '@chakra-ui/react';
import { ClassificationPresetName, classificationPresets } from '../../../models/program-classification';
import { MultiCheckSelect } from '../select/multi-check-select';
import { Trash } from '@phosphor-icons/react';
import { EUserRoles } from '../../../types/enums';
import { toTitleCase } from '../../../utils/utility-functions';
import { TInviteUserParams } from '../../../types/types';

const assignableRoles = [EUserRoles.adminManager, EUserRoles.admin, EUserRoles.systemAdmin];
const inboxOptions = Object.keys(classificationPresets).map((label) => ({
  label,
  value: label as ClassificationPresetName,
}));

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export interface InviteUserTableProps {
  rows: TInviteUserParams[];
  setRows: React.Dispatch<React.SetStateAction<TInviteUserParams[]>>;
  defaultRow: TInviteUserParams;
}

export const InviteUserTable: React.FC<InviteUserTableProps> = ({ rows, setRows, defaultRow }) => {
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

  return (
    <VStack spacing={5} align="stretch">
      {rows.map((row, index) => (
        <Box key={index} borderWidth="1px" borderRadius="md" p={4} bg="greys.grey10">
          <HStack spacing={4} align="start" width="100%">
            <FormControl isInvalid={row.email !== '' && !isValidEmail(row.email)}>
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

            <IconButton
              mt={8}
              aria-label="Remove"
              icon={<Trash size={20} />}
              onClick={() => handleRemove(index)}
              colorScheme="red"
              variant="ghost"
            />
          </HStack>
        </Box>
      ))}
      <Link onClick={handleAddRow} color="blue.500" fontWeight="normal" cursor="pointer" alignSelf="flex-start">
        + Add more emails
      </Link>
    </VStack>
  );
};
