import { Flex, FlexProps, Select, Text } from '@chakra-ui/react';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { IOption } from '../../../../types/types';
import { SharedSpinner } from '../shared-spinner';

interface IAsyncDropdownProps<T> extends FlexProps {
  label?: string;
  question?: string;
  valueField?: string;
  fetchOptions: () => Promise<IOption<T>[]>;
  fieldName: string;
  placeholderOptionLabel?: string;
}

export const AsyncDropdown = observer(
  <T,>({
    label,
    question,
    fetchOptions,
    fieldName,
    valueField,
    placeholderOptionLabel,
    ...rest
  }: IAsyncDropdownProps<T>) => {
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
        {label && <Text mb={1}>{label}</Text>}
        {error ? (
          <Text>{error.message}</Text>
        ) : (
          <Controller
            name={fieldName}
            control={control}
            rules={{ required: true }}
            render={({ field: { onChange, value } }) => (
              <>
                {question && (
                  <Text mb={1} pb={2}>
                    {question}
                  </Text>
                )}
                <Select
                  onChange={(e) => onChange(e.target.value)}
                  value={value ?? ''}
                  placeholder=""
                  bg="white"
                  borderColor="greys.grey02"
                >
                  <option value="" disabled hidden>
                    {placeholderOptionLabel ?? t('ui.selectPlaceholder')}
                  </option>
                  {options.map((option) => {
                    const optionValue = valueField ? option.value[valueField] : option.value;
                    return (
                      <option key={optionValue} value={optionValue}>
                        {option.label}
                      </option>
                    );
                  })}
                </Select>
              </>
            )}
          />
        )}
      </Flex>
    ) : (
      <SharedSpinner />
    );
  },
);
