import { Box, Checkbox, Flex, GridItem, Text } from '@chakra-ui/react';
import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMst } from '../../../../setup/root';
import {
  EPermitApplicationReviewerSortFields,
  EPermitApplicationSortFields,
  EPermitApplicationStatus,
  EPermitApplicationStatusGroup,
} from '../../../../types/enums';
import { ModelSearchInput } from '../../../shared/base/model-search-input';
import { GridHeader } from '../../../shared/grid/grid-header';
import { SortIcon } from '../../../shared/sort-icon';
import { EnergySavingsApplicationFilter } from '../../../shared/energy-savings-applications/energy-savings-application-filter';

export const GridHeaders = observer(function GridHeaders() {
  const { permitApplicationStore, userStore } = useMst();
  const { t } = useTranslation();
  const getSortColumnHeader = permitApplicationStore?.getSortColumnHeader;
  const { search } = permitApplicationStore;
  const currentUserId = userStore.currentUser?.id;
  const [assignedToMeOnly, setAssignedToMeOnly] = useState(false);

  const { toggleSort, sort } = permitApplicationStore;

  return (
    <Box display={'contents'} role={'rowgroup'}>
      <Box display="contents" role="row">
        <GridItem as={Flex} gridColumn="span 7" p={6} bg="greys.grey10" alignItems="center">
          <Flex justifyContent="flex-end" w="100%">
            <Flex gap={2} maxW="1000px" w="fit-content">
              <Box flex="1">
                <EnergySavingsApplicationFilter
                  statusGroups={[
                    EPermitApplicationStatusGroup.resubmitted,
                    EPermitApplicationStatusGroup.submitted,
                    EPermitApplicationStatusGroup.revisionsRequested,
                    EPermitApplicationStatusGroup.inReview,
                    EPermitApplicationStatusGroup.ineligible,
                    EPermitApplicationStatusGroup.approved,
                  ]}
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
                  isChecked={assignedToMeOnly}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setAssignedToMeOnly(checked);

                    if (checked && currentUserId) {
                      search({ assignedUserId: currentUserId });
                    } else {
                      search();
                    }
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
                  onClick={() => toggleSort(castField)}
                  borderRight={'1px solid'}
                  borderColor={'border.light'}
                  px={4}
                >
                  <Text textAlign="left">{getSortColumnHeader(castField)}</Text>
                  <SortIcon<EPermitApplicationSortFields> field={castField} currentSort={sort} />
                </Flex>
              </GridHeader>
            );
          })
          .filter((outNull) => outNull)}
      </Box>
    </Box>
  );
});
