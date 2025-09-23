import { Badge, Box, Flex, Menu, MenuButton, MenuItem, MenuList, Link } from '@chakra-ui/react';
import { Eye, PencilSimple, Trash, Envelope, Users, Prohibit, HourglassMedium } from '@phosphor-icons/react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { IContractor } from '../../../models/contractor';
import { SearchGridItem } from '../../shared/grid/search-grid-item';
import { useMst } from '../../../setup/root';

interface ContractorRowProps {
  contractor: IContractor;
}

export const ContractorRow = observer(({ contractor }: ContractorRowProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { contractorStore } = useMst();

  const handleEdit = () => {
    navigate(`/contractor-management/${contractor.id}/edit`);
  };

  const handleView = () => {
    navigate(`/contractor-management/${contractor.id}`);
  };

  const handleDelete = async () => {
    if (window.confirm(t('contractor.management.confirmDelete', 'Are you sure you want to delete this contractor?'))) {
      try {
        const success = await contractor.destroy();
        if (success) {
          // Refresh the search results to update pagination
          await contractorStore.searchContractors({
            page: contractorStore.currentPage,
            countPerPage: contractorStore.countPerPage,
          });
          console.log('Contractor removed successfully');
        } else {
          console.error('Failed to remove contractor');
        }
      } catch (error) {
        console.error('Error removing contractor:', error);
      }
    }
  };

  const handleInviteEmployee = () => {
    navigate(`/contractor-management/${contractor.id}/invite-employee`);
  };

  const handleViewEmployees = () => {
    navigate(`/contractor-management/${contractor.id}/employees`);
  };

  const handleSuspend = async () => {
    if (
      window.confirm(t('contractor.management.confirmSuspend', 'Are you sure you want to suspend this contractor?'))
    ) {
      // TODO: Implement suspend functionality
      console.log('Suspend contractor:', contractor.id);
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '-';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(date));
  };

  return (
    <Box key={contractor.id} className="contractor-index-grid-row" role="row" display="contents">
      <SearchGridItem fontSize="sm">{contractor.id}</SearchGridItem>
      <SearchGridItem fontSize="sm">{contractor.contactName}</SearchGridItem>
      <SearchGridItem fontSize="sm">{contractor.contact?.email || '-'}</SearchGridItem>
      <SearchGridItem fontSize="sm" maxWidth="300px" sx={{ wordBreak: 'break-word' }}>
        {contractor.businessName}
      </SearchGridItem>
      <SearchGridItem fontSize="sm">{t('contractor.fields.programPlaceholder', 'N/A')}</SearchGridItem>
      <SearchGridItem fontSize="sm">{formatDate(contractor.updatedAt)}</SearchGridItem>
      <SearchGridItem>
        <Flex justify="center">
          <Menu>
            <MenuButton
              as={Link}
              color="black"
              textDecoration="underline"
              _hover={{ textDecoration: 'underline', color: 'theme.blue' }}
              fontSize="sm"
              fontWeight="normal"
              cursor="pointer"
            >
              {t('contractor.actions.manage')}
            </MenuButton>
            <MenuList>
              <MenuItem icon={<Envelope />} onClick={handleInviteEmployee}>
                {t('contractor.actions.inviteEmployee')}
              </MenuItem>
              <MenuItem icon={<Users />} onClick={handleViewEmployees}>
                {t('contractor.actions.viewEmployees')}
              </MenuItem>
              <MenuItem icon={<PencilSimple />} onClick={handleEdit}>
                {t('contractor.actions.editContractor')}
              </MenuItem>
              <MenuItem icon={<HourglassMedium />} onClick={handleSuspend}>
                {t('contractor.actions.suspendContractor')}
              </MenuItem>
              <MenuItem icon={<Trash />} onClick={handleDelete} color="red.500">
                {t('contractor.actions.removeContractor')}
              </MenuItem>
            </MenuList>
          </Menu>
        </Flex>
      </SearchGridItem>
    </Box>
  );
});
