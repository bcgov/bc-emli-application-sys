import { InputGroupProps, InputProps } from '@chakra-ui/react';
import { observer } from 'mobx-react-lite';
import React, { useCallback } from 'react';
import { ISearch } from '../../../lib/create-search-model';
import { debounce } from '../../../utils/utility-functions';
import { SearchInput } from './search-input';

interface IProps<TSearchModel extends ISearch> {
  searchModel: TSearchModel;
  inputGroupProps?: Partial<InputGroupProps>;
  inputProps?: Partial<InputProps>;
  debounceTimeInMilliseconds?: number;
  setAllUsers?: (allUsers: boolean) => void;
  customSearchFn?: () => void;
}

export const ModelSearchInput = observer(function ModelSearchInput<TSearchModel extends ISearch>({
  searchModel,
  inputGroupProps,
  inputProps,
  debounceTimeInMilliseconds = 500,
  setAllUsers,
  customSearchFn,
}: IProps<TSearchModel>) {
  const { setQuery, query, search } = searchModel;
  const searchFn = customSearchFn || search;
  const debouncedSearch = useCallback(debounce(searchFn, debounceTimeInMilliseconds), [searchFn]);

  const onSearch = (query: string) => {
    setQuery(query);
    setAllUsers?.(true); // call if passed
    debouncedSearch();
  };

  return (
    <SearchInput query={query} onQueryChange={onSearch} inputGroupProps={inputGroupProps} inputProps={inputProps} />
  );
});
