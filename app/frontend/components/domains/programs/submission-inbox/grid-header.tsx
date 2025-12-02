import { Box, Checkbox, Flex, GridItem, Text } from '@chakra-ui/react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useMst } from '../../../../setup/root';
import {
  EPermitApplicationReviewerSortFields,
  EPermitApplicationSortFields,
  EPermitApplicationStatusGroup,
  EPermitClassificationCode,
} from '../../../../types/enums';
import { ModelSearchInput } from '../../../shared/base/model-search-input';
import { GridHeader } from '../../../shared/grid/grid-header';
import { SortIcon } from '../../../shared/sort-icon';
import { EnergySavingsApplicationFilter } from '../../../shared/energy-savings-applications/energy-savings-application-filter';

export const GridHeaders = observer(function GridHeaders() {
  const { permitApplicationStore, userStore, permitClassificationStore, programStore } = useMst();
  const { t } = useTranslation();
  const getSortColumnHeader = permitApplicationStore?.getSortColumnHeader;
  const currentUserId = userStore.currentUser?.id;


  // Don't render the filter if program is not set yet (prevents premature search on mount)
  if (!programStore.currentProgram) {
    return null;
  }

  // Filters now contain codes directly, not IDs
  const submissionTypeCodes = permitApplicationStore.submissionTypeIdFilter ? [...permitApplicationStore.submissionTypeIdFilter] : [];
  const userGroupTypeCode = permitApplicationStore.userGroupTypeIdFilter;

  const isContractor = userGroupTypeCode === EPermitClassificationCode.contractor;
  const isOnboarding = submissionTypeCodes?.includes(EPermitClassificationCode.onboarding);
  const isOnlyOnboarding = submissionTypeCodes?.length === 1 && submissionTypeCodes?.includes(EPermitClassificationCode.onboarding);

  let statusGroups: EPermitApplicationStatusGroup[];

  if (isContractor && isOnlyOnboarding) {
    // For contractor onboarding, show onboarding-specific statuses
    statusGroups = [
      EPermitApplicationStatusGroup.submitted,
      EPermitApplicationStatusGroup.trainingPending,
      EPermitApplicationStatusGroup.approved,
      EPermitApplicationStatusGroup.ineligible,
    ];
  } else if (isContractor) {
    // For contractor applications/invoices, show contractor-specific statuses
    statusGroups = [
      EPermitApplicationStatusGroup.submitted,
      EPermitApplicationStatusGroup.revisionsRequested,
      EPermitApplicationStatusGroup.resubmitted,
      EPermitApplicationStatusGroup.inReview,
      EPermitApplicationStatusGroup.approvedPending,
      EPermitApplicationStatusGroup.approvedPaid,
      EPermitApplicationStatusGroup.ineligible,
    ];
  } else {
    // For participant submissions, show participant statuses
    statusGroups = [
      EPermitApplicationStatusGroup.submitted,
      EPermitApplicationStatusGroup.revisionsRequested,
      EPermitApplicationStatusGroup.resubmitted,
      EPermitApplicationStatusGroup.inReview,
      EPermitApplicationStatusGroup.approved,
      EPermitApplicationStatusGroup.ineligible,
    ];
  }

  const filterKey = `filter-${permitApplicationStore.userGroupTypeIdFilter}-${submissionTypeCodes?.join(',') || 'none'}`;

  return (
    <Box display={'contents'} role={'rowgroup'}>
      <Box display="contents" role="row">
        <GridItem as={Flex} gridColumn="span 7" p={6} bg="greys.grey10" alignItems="center">
          <Flex justifyContent="flex-end" w="100%">
            <Flex gap={2} maxW="1000px" w="fit-content">
              <Box flex="1">
                <EnergySavingsApplicationFilter
                  key={filterKey}
                  statusGroups={statusGroups}
                />
              </Box>
              <Box flex="1">
                <ModelSearchInput searchModel={permitApplicationStore} inputGroupProps={{ w: 'full' }} />
              </Box>
              <Box
                flex="1"
                border="1px solid"
                borderColor="greys.lightGrey"
                borderRadius="md"
                px={3}
                py={1}
                bg="white"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Checkbox
                  colorScheme="gray"
                  isChecked={!!permitApplicationStore.assignedUserIdFilter}
                  onChange={(e) => {
                    const checked = e.target.checked;

                    if (checked && currentUserId) {
                      permitApplicationStore.setAssignedUserIdFilter(currentUserId);
                    } else {
                      permitApplicationStore.setAssignedUserIdFilter(null);
                    }
                    permitApplicationStore.search();
                  }}
                >
                  {t('energySavingsApplication.submissionInbox.assignedTo')}
                </Checkbox>
              </Box>
            </Flex>
          </Flex>
        </GridItem>
      </Box>
      <Box display={'contents'} role={'row'}>
        {Object.keys(EPermitApplicationReviewerSortFields)
          .map((key) => {
            let castField = EPermitApplicationReviewerSortFields[key] as EPermitApplicationSortFields;
            if (!EPermitApplicationReviewerSortFields[key]) return;

            return (
              <GridHeader key={key} role={'columnheader'}>
                <Flex
                  w={'full'}
                  as={'button'}
                  justifyContent={'space-between'}
                  cursor="pointer"
                  onClick={() => permitApplicationStore.toggleSort(castField)}
                  borderRight={'1px solid'}
                  borderColor={'border.light'}
                  px={4}
                >
                  <Text textAlign="left">{getSortColumnHeader(castField)}</Text>
                  {EPermitApplicationReviewerSortFields[key] !== EPermitApplicationReviewerSortFields.actions && (
                    <SortIcon<EPermitApplicationSortFields> field={castField} currentSort={permitApplicationStore.sort} />
                  )}
                </Flex>
              </GridHeader>
            );
          })
          .filter((outNull) => outNull)}
      </Box>
    </Box>
  );
});
