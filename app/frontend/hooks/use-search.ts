import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ISearch } from '../lib/create-search-model';
import { useMst } from '../setup/root';
import { ESortDirection } from '../types/enums';
import { TVisibility } from '../types/types';
import { parseBoolean } from '../utils/utility-functions';

export const useSearch = (searchModel: ISearch, dependencyArray: any[] = []) => {
  // Reset currents
  const { programId } = useParams();
  const { permitApplicationId } = useParams();
  const {
    programStore: { resetCurrentProgram },
    permitApplicationStore: { resetCurrentPermitApplication },
  } = useMst();

  useEffect(() => {
    if (!programId) resetCurrentProgram();
    if (!permitApplicationId) resetCurrentPermitApplication();
  }, [programId, permitApplicationId]);

  useEffect(() => {
    // This is necessary for preventing failed calls, IE when the currentJursidiction for user search is undefined
    if (dependencyArray.some((dep) => dep == null)) return;

    const queryParams = new URLSearchParams(location.search);
    const query = queryParams.get('query');
    const currentPage = queryParams.get('currentPage');
    const countPerPage = queryParams.get('countPerPage');
    const showArchived = queryParams.get('showArchived');
    const visibility = queryParams.get('visibility') as TVisibility;
    const sortDirection = queryParams.get('sortDirection') as ESortDirection;
    const sortField = queryParams.get('sortField');

    if (query) searchModel.setQuery(decodeURIComponent(query));
    if (currentPage) {
      searchModel.setCurrentPage(parseInt(decodeURIComponent(currentPage)));
    } else {
      searchModel.setCurrentPage(1);
    }
    if (countPerPage) searchModel.setCountPerPage(parseInt(decodeURIComponent(countPerPage)));
    if (showArchived) searchModel.setShowArchived(parseBoolean(showArchived));
    if (visibility) searchModel.setVisibility(visibility);
    if (sortDirection && sortField) {
      searchModel.applySort({ direction: sortDirection, field: sortField });
    } else {
      searchModel.clearSort();
    }

    searchModel.setFilters(queryParams);

    searchModel.fetchData({
      page: searchModel.currentPage,
      countPerPage: searchModel.countPerPage,
    });
  }, [...dependencyArray]);
};
