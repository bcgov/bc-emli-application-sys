import React from 'react';
import {
  Box,
  Checkbox,
  FormControl,
  FormLabel,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Button,
  useTheme,
} from '@chakra-ui/react';
import { CaretDown } from '@phosphor-icons/react';
import { Dispatch, SetStateAction } from 'react';

interface IMultiCheckSelectProps {
  selectedValues: string[];
  setSelectedValues: Dispatch<SetStateAction<string[]>>;
  allItems: { label: string; value: string }[];
  placeholder?: string;
  label?: string;
}

export const MultiCheckSelect: React.FC<IMultiCheckSelectProps> = ({
  selectedValues,
  setSelectedValues,
  allItems,
  label,
  placeholder = 'Select items...',
}) => {
  const toggleItem = (value: string) => {
    setSelectedValues((prev: string[]) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  };

  const selectedLabels = allItems
    .filter((item) => selectedValues.includes(item.value))
    .map((item) => item.label)
    .join(', ');

  return (
    <FormControl>
      {label && <FormLabel fontWeight="bold">{label}</FormLabel>}
      <Menu isLazy matchWidth closeOnSelect={false}>
        <MenuButton
          as={Button}
          w="full"
          textAlign="left"
          variant="outline"
          background="white"
          borderColor="gray.300"
          fontWeight="normal"
          _focus={{ boxShadow: 'outline' }}
          rightIcon={<CaretDown />}
        >
          {selectedLabels || placeholder}
        </MenuButton>
        <MenuList maxH="200px" overflowY="auto">
          {allItems.map((item) => (
            <MenuItem key={item.value} onClick={() => toggleItem(item.value)}>
              <Checkbox isChecked={selectedValues.includes(item.value)} pointerEvents="none">
                {item.label}
              </Checkbox>
            </MenuItem>
          ))}
        </MenuList>
      </Menu>
    </FormControl>
  );
};
