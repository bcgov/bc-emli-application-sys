import { Input, InputGroup, InputGroupProps, InputLeftElement, InputProps } from '@chakra-ui/react';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { ISearch } from '../../../lib/create-search-model';

interface IProps {
  query: string;
  onQueryChange: (value: string) => void;
  inputGroupProps?: InputGroupProps;
  inputProps?: InputProps;
}

export const SearchInput = observer(function SearchInput(props: IProps) {
  const { query, onQueryChange, inputGroupProps = {}, inputProps } = props;
  const inputId = `search-input-${Math.random().toString(36).substring(2, 11)}`;

  return (
    <InputGroup as={'section'} bg={'white'} {...inputGroupProps} w={inputGroupProps?.w ?? { md: '20%', base: 'full' }}>
      <Input
        id={inputId}
        aria-label={inputProps?.placeholder || 'Search'}
        title={'search input'}
        type={'search'}
        placeholder={'Search'}
        fontSize={'sm'}
        onChange={(e) => onQueryChange(e.target.value)}
        value={query ?? ''}
        h="38px"
        borderColor="border.input"
        role="searchbox"
        aria-describedby={`${inputId}-description`}
        {...inputProps}
      />
      <InputLeftElement color={'greys.grey01'} aria-hidden="true">
        <MagnifyingGlass size={16} />
      </InputLeftElement>
    </InputGroup>
  );
});
