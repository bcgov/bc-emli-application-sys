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
}

export const AsyncDropdown = observer(
  <T,>({ label, question, fetchOptions, fieldName, placeholderOptionLabel, ...rest }: IAsyncDropdownProps<T>) => {
    const { control } = useFormContext();
    const [options, setOptions] = useState<IOption<T>[]>([]);
    const [error, setError] = useState<Error | undefined>(undefined);
    const { t } = useTranslation();

    useEffect(() => {
      (async () => {
        try {
          const opts = await fetchOptions();
          setOptions(opts);
        } catch (e) {
          setError(e instanceof Error ? e : new Error(t('errors.fetchOptions')));
        }
      })();
    }, []);

    return options?.length > 0 ? (
      <Flex direction="column" w="full" {...rest}>
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

          <Controller
            name={fieldName}
            control={control}
            rules={{ required: true }}
            render={({ field: { onChange, value } }) => (
              <ChakraReactSelect
                isClearable={false}
                options={options}
                getOptionLabel={(opt) => opt.label}
                getOptionValue={(opt) => String(opt.value)}
                placeholder={placeholderOptionLabel ?? t('ui.selectPlaceholder')}
                value={options.find((opt) => opt.value === value) ?? null}
                onChange={(selectedOption) => {
                  onChange((selectedOption as IOption<T>)?.value ?? null);
                }}
                chakraStyles={{
                  container: (base) => ({
                    ...base,
                    minWidth: '20rem', // adjust as needed
                    width: 'fit-content',
                  }),
                  control: (base) => ({
                    ...base,
                    minWidth: '20rem',
                    width: 'fit-content',
                    backgroundColor: 'white',
                  }),
                  placeholder: (base) => ({
                    ...base,
                    color: 'gray.400',
                    fontStyle: 'italic',
                  }),
                  dropdownIndicator: (base, state) => ({
                    ...base,
                    backgroundColor: 'white', // background of the icon button
                    color: 'gray.600', // color of the arrow icon
                  }),
                  indicatorSeparator: () => ({
                    display: 'none',
                  }),
                }}
              />
            )}
          />
        </Flex>
      </Flex>
    ) : (
      <SharedSpinner />
    );
  },
);
