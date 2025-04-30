import { Flex, FlexProps, Text } from '@chakra-ui/react';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { IOption } from '../../../../types/types';
import { SharedSpinner } from '../shared-spinner';
import { Select as ChakraReactSelect } from 'chakra-react-select';

interface IAsyncDropdownProps<T> extends FlexProps {
  label?: string;
  question?: string;
  fetchOptions: () => Promise<IOption<T>[]>;
  fieldName: string;
  placeholderOptionLabel?: string;
  useBoxWrapper?: boolean;
  onValueChange?: (value: T | null) => void;
}

export const AsyncDropdown = observer(
  <T,>({
    label,
    question,
    fetchOptions,
    fieldName,
    placeholderOptionLabel,
    useBoxWrapper,
    onValueChange,
    ...rest
  }: IAsyncDropdownProps<T>) => {
    const { control } = useFormContext();
    const [options, setOptions] = useState<IOption<T>[]>([]);
    const [error, setError] = useState<Error | undefined>(undefined);
    const { t } = useTranslation();

    // Effect to fetch options
    useEffect(() => {
      (async () => {
        try {
          const opts = await fetchOptions();
          setOptions(opts);
        } catch (e) {
          setError(e instanceof Error ? e : new Error(t('errors.fetchOptions')));
        }
      })();
    }, [fetchOptions, t]);

    const renderDropdown = (
      <Controller
        name={fieldName}
        control={control}
        rules={{ required: true }}
        render={({ field: { onChange, value } }) => (
          <ChakraReactSelect
            isClearable={false}
            options={options}
            getOptionLabel={(opt) => opt.label}
            getOptionValue={(opt) => JSON.stringify(opt.value)}
            placeholder={placeholderOptionLabel ?? t('ui.selectPlaceholder')}
            value={options.find((opt) => JSON.stringify(opt.value) === JSON.stringify(value)) ?? null}
            onChange={(selectedOption) => {
              const selectedValue = (selectedOption as IOption<T>)?.value ?? null;
              onChange(selectedValue);
              if (onValueChange) onValueChange(selectedValue);
            }}
            chakraStyles={{
              container: (base) => ({
                ...base,
                minWidth: '20rem',
                width: 'fit-content',
                cursor: 'pointer',
              }),
              control: (base) => ({
                ...base,
                minWidth: '20rem',
                width: 'fit-content',
                backgroundColor: 'white',
                cursor: 'pointer',
              }),
              placeholder: (base) => ({
                ...base,
                color: 'gray.400',
                fontStyle: 'italic',
              }),
              dropdownIndicator: (base) => ({
                ...base,
                backgroundColor: 'white',
                color: 'gray.600',
              }),
              indicatorSeparator: () => ({
                display: 'none',
              }),
            }}
          />
        )}
      />
    );

    // Error rendering if fetch fails
    if (error) {
      return (
        <Flex direction="column" w="full" {...rest}>
          <Text color="red.500">{t('errors.fetchOptions')}</Text>
        </Flex>
      );
    }

    // Render options or spinner
    return options?.length > 0 ? (
      <Flex direction="column" w="full" {...rest}>
        {useBoxWrapper ? (
          <Flex
            direction="column"
            bg="greys.grey10"
            p={4}
            border="1px solid"
            borderColor="greys.grey02"
            borderRadius="sm"
          >
            {label && <Text mb={1}>{label}</Text>}
            {question && <Text mb={2}>{question}</Text>}
            {renderDropdown}
          </Flex>
        ) : (
          <>
            {label && <Text mb={1}>{label}</Text>}
            {question && <Text mb={2}>{question}</Text>}
            {renderDropdown}
          </>
        )}
      </Flex>
    ) : (
      <SharedSpinner />
    );
  },
);

