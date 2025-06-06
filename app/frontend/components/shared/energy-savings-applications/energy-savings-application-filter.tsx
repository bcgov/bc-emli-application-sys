import {
  Button,
  Checkbox,
  Container,
  ContainerProps,
  Divider,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
} from '@chakra-ui/react';
import { CaretDown, Funnel } from '@phosphor-icons/react';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ISearch } from '../../../lib/create-search-model';
import { useMst } from '../../../setup/root';
import { TFilterableStatus } from '../../../stores/energy-savings-application-store';
import { EPermitApplicationStatus, EPermitApplicationStatusGroup, EUserRoles } from '../../../types/enums';

interface IPermitApplicationStatusTabsProps<TSearchModel extends ISearch> extends ContainerProps {}

export const EnergySavingsApplicationFilter = observer(function ToggleArchivedButton<TSearchModel extends ISearch>({
  statusGroups,
  ...rest
}: IPermitApplicationStatusTabsProps<TSearchModel> & { statusGroups: EPermitApplicationStatusGroup[] }) {
  const { permitApplicationStore, userStore } = useMst();
  const currentUser = userStore.currentUser;
  const { t } = useTranslation();
  const queryParams = new URLSearchParams(location.search);
  const paramStatusFilterString = queryParams.get('status') || t('energySavingsApplication.statusGroup.filter');

  const paramStatusFilter = paramStatusFilterString.split(',') as TFilterableStatus[]; // Filter parameters
  const [selectedFilterLabel, setSelectedFilterLabel] = useState<string>(
    t('energySavingsApplication.statusGroup.filter'),
  );
  const { statusFilter, setStatusFilter, search } = permitApplicationStore;

  // Define the filters
  const draftFilters = [EPermitApplicationStatus.draft];
  const submittedFilters = [EPermitApplicationStatus.submitted];
  const inReviewFilters = [EPermitApplicationStatus.inReview];
  const approvedFilters = [EPermitApplicationStatus.approved];
  const ineligibleFilters = [EPermitApplicationStatus.ineligible];
  const revisionRequestedFilters = [EPermitApplicationStatus.revisionsRequested];
  const resubmittedFilters = [EPermitApplicationStatus.resubmitted];

  // Handle selected filters
  const [selectedFilters, setSelectedFilters] = useState<string[]>(paramStatusFilter);

  // Handle filters when checked/unchecked
  const handleFilterSelect = (filter: string, checked: boolean) => {
    let newSelectedFilters = checked ? [...selectedFilters, filter] : selectedFilters.filter((item) => item !== filter);

    // Remove "filter" if it exists in the selected filters
    newSelectedFilters = newSelectedFilters.filter((item) => item !== 'filter');

    // If no filters are selected, set all filters
    if (newSelectedFilters.length === 0) {
      setSelectedFilters(statusGroups.map((group) => group.toString()));
      setStatusFilter(statusGroups.flatMap(mapFilterToStatusArray));
    } else {
      setSelectedFilters(newSelectedFilters);
      // Map the selected filters to their corresponding status array
      const statusArray = newSelectedFilters.flatMap(mapFilterToStatusArray);
      setStatusFilter(statusArray);
    }

    // Trigger search with selected filters (even if it's for all statuses)
    search();

    // Update the URL based on selected filters
    const newParams = new URLSearchParams(location.search);
    if (newSelectedFilters.length > 0) {
      newParams.set('status', newSelectedFilters.flatMap(mapFilterToStatusArray)?.join(','));
    } else {
      newParams.delete('status');
    }
    window.history.replaceState(null, '', '?' + newParams.toString());
  };

  // Map filter to the status array
  const mapFilterToStatusArray = (filter: string): EPermitApplicationStatus[] => {
    switch (filter) {
      case 'draft':
        return draftFilters;
      case 'submitted':
        return submittedFilters;
      case 'inReview':
        return inReviewFilters;
      case 'approved':
        return approvedFilters;
      case 'ineligible':
        return ineligibleFilters;
      case 'resubmitted':
        return resubmittedFilters;
      case 'revisionsRequested':
        return revisionRequestedFilters;
      default:
        return [];
    }
  };

  const mapStatusToFilterArray = (filter: string) => {
    switch (filter) {
      case EPermitApplicationStatus.draft:
        return 'draft';
      case EPermitApplicationStatus.submitted:
        return 'submitted';
      case EPermitApplicationStatus.inReview:
        return 'inReview';
      case EPermitApplicationStatus.approved:
        return 'approved';
      case EPermitApplicationStatus.ineligible:
        return 'ineligible';
      case EPermitApplicationStatus.revisionsRequested:
        return 'revisionsRequested';
      case EPermitApplicationStatus.resubmitted:
        return 'resubmitted';
      default:
        return [];
    }
  };

  // Handle reset functionality
  const handleResetFilters = () => {
    setSelectedFilters([]);
    setStatusFilter([]);
    search(); // Trigger search with default filters
    const newParams = new URLSearchParams(location.search);
    newParams.delete('status');
    window.history.replaceState(null, '', '?' + newParams.toString());
  };

  useEffect(() => {
    let label: string = '';
    // If there are selected filters, show the number of selected filters
    if (selectedFilters.length === 0) {
      label = t('energySavingsApplication.statusGroup.filter');
    } else {
      label = `${t('energySavingsApplication.statusGroup.filter')} (${selectedFilters.length})`;
    }

    setSelectedFilterLabel(label);
  }, [selectedFilters, t]);

  useEffect(() => {
    //functionality to handle filters When first time page loads

    const params = new URLSearchParams(window.location.search);

    // Get the 'status' parameter and split it into an array
    const statusParam = params.get('status');
    if (statusParam) {
      const statusParamArray = statusParam.split(',');
      setSelectedFilters(statusParamArray.flatMap(mapStatusToFilterArray));
    } else {
      // Set the selected filters based on the provided statusGroups
      const statusArray = statusGroups.flatMap(mapFilterToStatusArray);
      setSelectedFilters(statusGroups.map((group) => group.toString()));
      setStatusFilter(statusArray);
      search();
    }
  }, []);

  useEffect(() => {
    setSelectedFilters(statusGroups.map((group) => group.toString())); // Select all filter buttons based on statusGroups
    setStatusFilter(statusGroups.flatMap(mapFilterToStatusArray)); // Apply statuses based on statusGroups
    search(); // Trigger search with all filters
  }, []);

  return (
    <Container maxW="container.lg" {...rest}>
      <Menu>
        <MenuButton
          as={Button}
          leftIcon={<Funnel />}
          rightIcon={<CaretDown />}
          bg="transparent"
          padding={4}
          whiteSpace="normal"
          wordBreak="break-word"
        >
          {selectedFilterLabel}
        </MenuButton>
        <MenuList>
          {statusGroups.map((filterValue) => (
            <MenuItem
              key={filterValue}
              onClick={() => {
                const isSelected = selectedFilters.includes(filterValue);
                handleFilterSelect(filterValue, !isSelected);
              }}
            >
              <Checkbox isChecked={selectedFilters.includes(filterValue)} pointerEvents="none">
                {filterValue === EPermitApplicationStatusGroup.submitted &&
                [EUserRoles.admin, EUserRoles.adminManager].includes(currentUser.role)
                  ? t(`energySavingsApplication.status.unread`)
                  : t(`energySavingsApplication.statusGroup.${filterValue}`)}
              </Checkbox>
            </MenuItem>
          ))}
          <Divider borderWidth="1px" />
          {/* Reset button at the bottom */}
          <MenuItem onClick={handleResetFilters}>
            <Text> {t(`energySavingsApplication.reset`)}</Text>
          </MenuItem>
        </MenuList>
      </Menu>
    </Container>
  );
});
