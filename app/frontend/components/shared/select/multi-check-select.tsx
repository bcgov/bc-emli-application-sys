import React from 'react';
import { Checkbox, FormControl, FormLabel, Menu, MenuButton, MenuList, MenuItem, Button } from '@chakra-ui/react';
import { CaretDown } from '@phosphor-icons/react';

interface IMultiCheckSelectProps<T extends string> {
  selectedValues: T[];
  setSelectedValues: (values: T[]) => void;
  allItems: { label: string; value: T }[];
  placeholder?: string;
  label?: string;
}

export const MultiCheckSelect = <T extends string>({
  selectedValues,
  setSelectedValues,
  allItems,
  label,
  placeholder = 'Select items...',
}: IMultiCheckSelectProps<T>) => {
  const toggleItem = (value: T) => {
    const newValues = selectedValues.includes(value)
      ? selectedValues.filter((v) => v !== value)
      : [...selectedValues, value];

    setSelectedValues(newValues);
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
