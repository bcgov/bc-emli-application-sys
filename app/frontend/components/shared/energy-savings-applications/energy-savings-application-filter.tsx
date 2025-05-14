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
} from "@chakra-ui/react"
import { CaretDown, Funnel } from "@phosphor-icons/react"
import { observer } from "mobx-react-lite"
import React, { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { ISearch } from "../../../lib/create-search-model"
import { useMst } from "../../../setup/root"
import { TFilterableStatus } from "../../../stores/energy-savings-application-store"
import { EPermitApplicationStatus, EPermitApplicationStatusGroup } from "../../../types/enums"

interface IPermitApplicationStatusTabsProps<TSearchModel extends ISearch> extends ContainerProps {}

export const EnergySavingsApplicationFilter = observer(function ToggleArchivedButton<TSearchModel extends ISearch>({
  ...rest
}: IPermitApplicationStatusTabsProps<TSearchModel>) {
  const { permitApplicationStore } = useMst()
  const { t } = useTranslation()
  const queryParams = new URLSearchParams(location.search)
  const paramStatusFilterString = queryParams.get("status") || t("energySavingsApplication.statusGroup.filter")

  const paramStatusFilter = paramStatusFilterString.split(",") as TFilterableStatus[] // Filter parameters
  const [selectedFilterLabel, setSelectedFilterLabel] = useState<string>(
    t("energySavingsApplication.statusGroup.filter")
  )
  const { statusFilter, setStatusFilter, search } = permitApplicationStore

  // Define the filters
  const draftFilters = [EPermitApplicationStatus.draft]
  const submittedFilters = [EPermitApplicationStatus.submitted]
  const inReviewFilters = [EPermitApplicationStatus.inReview];
  const updateNeededFilters = [EPermitApplicationStatus.updateNeeded];
  const approvedFilters = [EPermitApplicationStatus.approved];
  const ineligibleFilters = [EPermitApplicationStatus.ineligible];

  // Handle selected filters
  const [selectedFilters, setSelectedFilters] = useState<string[]>(paramStatusFilter);

  // Handle filters when checked/unchecked
  const handleFilterSelect = (filter: string, checked: boolean) => {
    let newSelectedFilters = checked ? [...selectedFilters, filter] : selectedFilters.filter((item) => item !== filter);

    // Remove "filter" if it exists in the selected filters
    newSelectedFilters = newSelectedFilters.filter((item) => item !== 'filter');

    // If no filters are selected, set all filters
    if (newSelectedFilters.length === 0) {
      setSelectedFilters(newSelectedFilters);
      setStatusFilter(Object.values(EPermitApplicationStatus) as EPermitApplicationStatus[]);
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
      case 'updateNeeded':
        return updateNeededFilters;
      case 'approved':
        return approvedFilters;
      case 'ineligible':
        return ineligibleFilters;
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
      case EPermitApplicationStatus.updateNeeded:
        return 'updateNeeded';
      case EPermitApplicationStatus.approved:
        return 'approved';
      case EPermitApplicationStatus.ineligible:
        return 'ineligible';
      default:
        return [];
    }
  };

  // Handle reset functionality
  const handleResetFilters = () => {
    setSelectedFilters([])
    setStatusFilter(Object.values(EPermitApplicationStatus) as EPermitApplicationStatus[])
    search()
    window.history.replaceState(null, "", "?currentPage=1")
  }

  useEffect(() => {
    let label: string = ""
    // If there are selected filters, show the number of selected filters
    if (selectedFilters.length === 0) {
      label = t("energySavingsApplication.statusGroup.filter")
    } else {
      label = `${t("energySavingsApplication.statusGroup.filter")} (${selectedFilters.length})`
    }

    setSelectedFilterLabel(label)
  }, [selectedFilters, t])

  useEffect(() => {
    //functionality to handle filters When first time page loads

    const params = new URLSearchParams(window.location.search)

    // Get the 'status' parameter and split it into an array
    const statusParam = params.get("status")
    if (statusParam) {
      const statusParamArray = statusParam.split(",")
      setSelectedFilters(statusParamArray.flatMap(mapStatusToFilterArray))
    } else {
      const mappedStatusArray = statusFilter
        .map((status: string) => {
          // Find the key of the enum that corresponds to the value
          const statusKey = Object.keys(EPermitApplicationStatusGroup).find(
            (key) => EPermitApplicationStatus[key as keyof typeof EPermitApplicationStatus] === status
          )

          // Return the key (the enum name) if it exists
          return statusKey ? statusKey : undefined
        })
        .filter((status): status is keyof typeof EPermitApplicationStatus => status !== undefined)

      // Set the selected filters using the mapped keys
      setSelectedFilters(mappedStatusArray)
    }
  }, [])

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
          {Object.values(EPermitApplicationStatusGroup).map((filterValue) => (
            <MenuItem
              key={filterValue}
              onClick={() => {
                const isSelected = selectedFilters.includes(filterValue);
                handleFilterSelect(filterValue, !isSelected);
              }}
            >
              <Checkbox isChecked={selectedFilters.includes(filterValue)} pointerEvents="none">
                {t(`energySavingsApplication.statusGroup.${filterValue}`)}
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
})
