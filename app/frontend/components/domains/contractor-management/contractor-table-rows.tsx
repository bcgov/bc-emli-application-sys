import { Badge, Box, Flex, Menu, MenuButton, MenuItem, MenuList, Link } from '@chakra-ui/react';
import { Eye, PencilSimple, Envelope, Users, Prohibit, HourglassMedium, Trash } from '@phosphor-icons/react';
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

  const handleInviteEmployee = () => {
    navigate(`/contractor-management/${contractor.id}/invite-employee`);
  };

  const handleViewEmployees = () => {
    navigate(`/contractor-management/${contractor.id}/employees`);
  };

  const handleSuspend = async () => {
    if (window.confirm(t('contractor.management.confirmSuspend'))) {
      // TODO: Implement suspend functionality
    }
  };

  const handleRemove = async () => {
    if (window.confirm(t('contractor.management.confirmDelete'))) {
      // TODO: Implement remove functionality
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
    <Box key={contractor.number} className="contractor-index-grid-row" role="row" display="contents">
      <SearchGridItem fontSize="sm" role="cell">
        <span aria-label={`Contractor ID: ${contractor.number}`}>{contractor.number}</span>
      </SearchGridItem>
      <SearchGridItem fontSize="sm" role="cell">
        <span aria-label={`Primary contact name: ${contractor.contactName || 'Not specified'}`}>
          {contractor.contactName}
        </span>
      </SearchGridItem>
      <SearchGridItem fontSize="sm" role="cell">
        <span aria-label={`Primary email: ${contractor.contact?.email || 'Not specified'}`}>
          {contractor.contact?.email || '-'}
        </span>
      </SearchGridItem>
      <SearchGridItem fontSize="sm" maxWidth="300px" sx={{ wordBreak: 'break-word' }} role="cell">
        <span aria-label={`Doing business as: ${contractor.businessName}`}>{contractor.businessName}</span>
      </SearchGridItem>
      <SearchGridItem fontSize="sm" role="cell">
        <span aria-label={`Program name: ${t('contractor.fields.programPlaceholder', 'N/A')}`}>
          {t('contractor.fields.programPlaceholder', 'N/A')}
        </span>
      </SearchGridItem>
      <SearchGridItem fontSize="sm" role="cell">
        <span aria-label={`Last updated: ${formatDate(contractor.updatedAt)}`}>{formatDate(contractor.updatedAt)}</span>
      </SearchGridItem>
      <SearchGridItem role="cell">
        <Flex justify="center">
          <Menu>
            <MenuButton
              as={Link}
              color="black"
              textDecoration="underline"
              border="2px solid transparent"
              _hover={{ textDecoration: 'underline', color: 'theme.blue' }}
              sx={{
                '&:focus:not(:focus-visible)': {
                  outline: 'none',
                  border: '2px solid transparent',
                },
              }}
              _focusVisible={{
                outline: 'none',
                border: '2px solid',
                borderColor: 'theme.blue',
                textDecoration: 'underline',
              }}
              fontSize="sm"
              fontWeight="normal"
              cursor="pointer"
              tabIndex={0}
              aria-label={`Manage actions for contractor ${contractor.businessName}`}
              aria-haspopup="menu"
            >
              {t('contractor.actions.manage')}
            </MenuButton>
            <MenuList role="menu" aria-label="Contractor management actions" _focus={{ outline: 'none' }}>
              <MenuItem
                icon={<Envelope />}
                onClick={handleInviteEmployee}
                role="menuitem"
                aria-label={`Invite employees for ${contractor.businessName}`}
                _focus={{ bg: 'blue.50', outline: 'none' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleInviteEmployee();
                  }
                }}
              >
                {t('contractor.actions.inviteEmployee')}
              </MenuItem>
              <MenuItem
                icon={<Users />}
                onClick={handleViewEmployees}
                role="menuitem"
                aria-label={`View employees for ${contractor.businessName}`}
                _focus={{ bg: 'blue.50', outline: 'none' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleViewEmployees();
                  }
                }}
              >
                {t('contractor.actions.viewEmployees')}
              </MenuItem>
              <MenuItem
                icon={<PencilSimple />}
                onClick={handleEdit}
                role="menuitem"
                aria-label={`Edit contractor details for ${contractor.businessName}`}
                _focus={{ bg: 'blue.50', outline: 'none' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleEdit();
                  }
                }}
              >
                {t('contractor.actions.editContractor')}
              </MenuItem>
              <MenuItem
                icon={<HourglassMedium />}
                onClick={handleSuspend}
                role="menuitem"
                aria-label={`Suspend contractor ${contractor.businessName}`}
                _focus={{ bg: 'blue.50', outline: 'none' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSuspend();
                  }
                }}
              >
                {t('contractor.actions.suspendContractor')}
              </MenuItem>
              <MenuItem
                icon={<Trash />}
                onClick={handleRemove}
                color="red.500"
                role="menuitem"
                aria-label={`Remove contractor ${contractor.businessName}`}
                _focus={{ bg: 'red.50', outline: 'none' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleRemove();
                  }
                }}
              >
                {t('contractor.actions.removeContractor')}
              </MenuItem>
            </MenuList>
          </Menu>
        </Flex>
      </SearchGridItem>
    </Box>
  );
});
