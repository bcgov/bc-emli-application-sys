import {
  Button,
  Checkbox,
  Container,
  ContainerProps,
  Divider,
  Flex,
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
  const paramStatusFilterString = queryParams.get('status');

  const paramStatusFilter = paramStatusFilterString?.split(',') as TFilterableStatus[];
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
  // Track pending selections (before apply is clicked)
  const [pendingFilters, setPendingFilters] = useState<string[]>(
    paramStatusFilter || statusGroups.map((group) => group.toString()),
  );

  // Handle filters when checked/unchecked - only update pending filters, don't apply yet
  const handleFilterSelect = (filter: string, checked: boolean) => {
    let newPendingFilters = checked ? [...pendingFilters, filter] : pendingFilters.filter((item) => item !== filter);

    // Remove "filter" if it exists in the pending filters
    newPendingFilters = newPendingFilters.filter((item) => item !== 'filter');

    setPendingFilters(newPendingFilters);
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

  // Handle apply functionality - apply the pending filters
  const handleApplyFilters = () => {
    let filtersToApply = pendingFilters;

    // If no filters are selected, select all filters
    if (filtersToApply.length === 0) {
      filtersToApply = statusGroups.map((group) => group.toString());
      setPendingFilters(filtersToApply);
    }

    setSelectedFilters(filtersToApply);
    setStatusFilter(filtersToApply.flatMap(mapFilterToStatusArray));
    search(); // Trigger search with applied filters

    // Update the URL based on applied filters
    const newParams = new URLSearchParams(location.search);
    newParams.set('status', filtersToApply.flatMap(mapFilterToStatusArray).join(','));
    window.history.replaceState(null, '', '?' + newParams.toString());
  };

  // Handle reset functionality - select all options instead of deselecting
  const handleResetFilters = () => {
    const allFilters = statusGroups.map((group) => group.toString());
    setPendingFilters(allFilters);
    setSelectedFilters(allFilters);
    setStatusFilter(statusGroups.flatMap(mapFilterToStatusArray));
    search(); // Trigger search with all filters selected
    const newParams = new URLSearchParams(location.search);
    newParams.set('status', statusGroups.flatMap(mapFilterToStatusArray).join(','));
    window.history.replaceState(null, '', '?' + newParams.toString());
  };

  useEffect(() => {
    //functionality to handle filters When first time page loads

    const params = new URLSearchParams(window.location.search);

    // Get the 'status' parameter and split it into an array
    const statusParam = params.get('status');
    if (statusParam) {
      const statusParamArray = statusParam.split(',');
      const filtersFromUrl = statusParamArray.flatMap(mapStatusToFilterArray);
      setSelectedFilters(filtersFromUrl);
      setPendingFilters(filtersFromUrl);
    } else {
      // Set the selected filters based on the provided statusGroups
      const allFilters = statusGroups.map((group) => group.toString());
      const statusArray = statusGroups.flatMap(mapFilterToStatusArray);
      setSelectedFilters(allFilters);
      setPendingFilters(allFilters);
      setStatusFilter(statusArray);
      search();
    }
  }, []);

  useEffect(() => {
    const allFilters = statusGroups.map((group) => group.toString());
    setSelectedFilters(allFilters); // Select all filter buttons based on statusGroups
    setPendingFilters(allFilters); // Initialize pending filters
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
          {pendingFilters?.length > 0
            ? `${t('energySavingsApplication.statusGroup.filter')} (${pendingFilters.length})`
            : t('energySavingsApplication.statusGroup.filter')}
        </MenuButton>
        <MenuList>
          {statusGroups.map((filterValue) => (
            <MenuItem
              key={filterValue}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const isSelected = pendingFilters?.includes(filterValue);
                handleFilterSelect(filterValue, !isSelected);
              }}
              closeOnSelect={false}
            >
              <Checkbox isChecked={pendingFilters?.includes(filterValue)} pointerEvents="none">
                {filterValue === EPermitApplicationStatusGroup.submitted &&
                [EUserRoles.admin, EUserRoles.adminManager].includes(currentUser.role)
                  ? t(`energySavingsApplication.status.unread`)
                  : t(`energySavingsApplication.statusGroup.${filterValue}`)}
              </Checkbox>
            </MenuItem>
          ))}
          <Divider borderWidth="1px" />
          {/* Apply and Reset buttons horizontally */}
          <MenuItem p={2}>
            <Flex w="full" gap={2}>
              <Button
                onClick={handleApplyFilters}
                bg="theme.blue"
                color="white"
                _hover={{ bg: 'theme.blueAlt' }}
                size="sm"
                flex={1}
              >
                Apply
              </Button>
              <Button onClick={handleResetFilters} variant="outline" size="sm" flex={1}>
                {t('energySavingsApplication.reset')}
              </Button>
            </Flex>
          </MenuItem>
        </MenuList>
      </Menu>
    </Container>
  );
});
