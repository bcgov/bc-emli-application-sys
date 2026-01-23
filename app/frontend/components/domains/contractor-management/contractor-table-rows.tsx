import { Badge, Box, Flex, Menu, MenuButton, MenuItem, MenuList, Link } from '@chakra-ui/react';
import {
  Eye,
  PencilSimple,
  Envelope,
  Users,
  Prohibit,
  HourglassMedium,
  Trash,
  ArrowsLeftRight,
} from '@phosphor-icons/react';
import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { IContractor } from '../../../models/contractor';
import { SearchGridItem } from '../../shared/grid/search-grid-item';
import { useMst } from '../../../setup/root';
import { GlobalConfirmationModal } from '../../shared/modals/global-confirmation-modal';

interface ContractorRowProps {
  contractor: IContractor;
  status?: 'active' | 'suspended' | 'removed';
}

export const ContractorRow = observer(({ contractor, status = 'active' }: ContractorRowProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { contractorStore } = useMst();
  const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
  const [isUnsuspendModalOpen, setIsUnsuspendModalOpen] = useState(false);
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);

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

  const handleSuspend = () => {
    setIsSuspendModalOpen(true);
  };

  const handleSuspendConfirm = () => {
    setIsSuspendModalOpen(false);
    // Navigate to reason page
    navigate(`/contractor-management/${contractor.id}/suspend/reason`);
  };

  const handleUnsuspend = () => {
    setIsUnsuspendModalOpen(true);
  };

  const handleUnsuspendConfirm = async () => {
    setIsUnsuspendModalOpen(false);
    const response = await contractorStore.unsuspendContractor(contractor.id);

    if (response.ok) {
      navigate(`/contractor-management/${contractor.id}/unsuspend-confirmation`);
    }
  };

  const handleRemove = () => {
    setIsRemoveModalOpen(true);
  };

  const handleRemoveConfirm = () => {
    setIsRemoveModalOpen(false);
    // Navigate to reason page
    navigate(`/contractor-management/${contractor.id}/remove/removal-reason`);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '-';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(date));
  };

  // Render columns based on status
  const renderActiveColumns = () => (
    <>
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
        <span aria-label={`Last updated: ${formatDate(contractor.updatedAt)}`}>{formatDate(contractor.updatedAt)}</span>
      </SearchGridItem>
    </>
  );

  const renderSuspendedColumns = () => (
    <>
      <SearchGridItem fontSize="sm" role="cell">
        <span aria-label={`Contractor ID: ${contractor.number}`}>{contractor.number}</span>
      </SearchGridItem>
      <SearchGridItem fontSize="sm" maxWidth="300px" sx={{ wordBreak: 'break-word' }} role="cell">
        <span aria-label={`Doing business as: ${contractor.businessName}`}>{contractor.businessName}</span>
      </SearchGridItem>
      <SearchGridItem fontSize="sm" role="cell">
        <span aria-label={`Primary contact name: ${contractor.contactName || 'Not specified'}`}>
          {contractor.contactName}
        </span>
      </SearchGridItem>
      <SearchGridItem fontSize="sm" role="cell">
        <span aria-label={`Date suspended: ${formatDate(contractor.suspendedAt)}`}>
          {formatDate(contractor.suspendedAt)}
        </span>
      </SearchGridItem>
      <SearchGridItem fontSize="sm" role="cell">
        <span aria-label={`Suspended by: ${contractor.suspendedByName || 'Not specified'}`}>
          {contractor.suspendedByName || 'N/A'}
        </span>
      </SearchGridItem>
    </>
  );

  const renderRemovedColumns = () => (
    <>
      <SearchGridItem fontSize="sm" role="cell">
        <span aria-label={`Contractor ID: ${contractor.number}`}>{contractor.number}</span>
      </SearchGridItem>
      <SearchGridItem fontSize="sm" maxWidth="300px" sx={{ wordBreak: 'break-word' }} role="cell">
        <span aria-label={`Doing business as: ${contractor.businessName}`}>{contractor.businessName}</span>
      </SearchGridItem>
      <SearchGridItem fontSize="sm" role="cell">
        <span aria-label={`Primary contact name: ${contractor.contactName || 'Not specified'}`}>
          {contractor.contactName}
        </span>
      </SearchGridItem>
      <SearchGridItem fontSize="sm" role="cell">
        <span aria-label={`Date removed: ${formatDate(contractor.deactivatedAt)}`}>
          {formatDate(contractor.deactivatedAt)}
        </span>
      </SearchGridItem>
      <SearchGridItem fontSize="sm" role="cell">
        <span aria-label={`Removed by: ${contractor.deactivatedByName || 'Not specified'}`}>
          {contractor.deactivatedByName || 'N/A'}
        </span>
      </SearchGridItem>
    </>
  );

  const renderColumns = () => {
    switch (status) {
      case 'suspended':
        return renderSuspendedColumns();
      case 'removed':
        return renderRemovedColumns();
      default:
        return renderActiveColumns();
    }
  };

  return (
    <Box key={contractor.number} className="contractor-index-grid-row" role="row" display="contents">
      {renderColumns()}
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
              {/* Active contractors: All menu items */}
              {!contractor.isSuspended && !contractor.isDeactivated && (
                <>
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
                </>
              )}

              {/* Suspended contractors: Unsuspend, View contractor, Remove */}
              {contractor.isSuspended && !contractor.isDeactivated && (
                <>
                  <MenuItem
                    icon={<ArrowsLeftRight />}
                    onClick={handleUnsuspend}
                    role="menuitem"
                    aria-label={`Unsuspend contractor ${contractor.businessName}`}
                    _focus={{ bg: 'blue.50', outline: 'none' }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleUnsuspend();
                      }
                    }}
                  >
                    {t('contractor.actions.unsuspendContractor')}
                  </MenuItem>
                  <MenuItem
                    icon={<Eye />}
                    onClick={handleView}
                    role="menuitem"
                    aria-label={`View contractor ${contractor.businessName}`}
                    _focus={{ bg: 'blue.50', outline: 'none' }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleView();
                      }
                    }}
                  >
                    {t('contractor.actions.viewContractor')}
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
                </>
              )}

              {/* Removed contractors: View contractor only */}
              {contractor.isDeactivated && (
                <MenuItem
                  icon={<Eye />}
                  onClick={handleView}
                  role="menuitem"
                  aria-label={`View contractor ${contractor.businessName}`}
                  _focus={{ bg: 'blue.50', outline: 'none' }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleView();
                    }
                  }}
                >
                  {t('contractor.actions.viewContractor')}
                </MenuItem>
              )}
            </MenuList>
          </Menu>
        </Flex>
      </SearchGridItem>

      <GlobalConfirmationModal
        headerText={t(
          'contractor.suspend.modal.title',
          `Are you sure you want to suspend ${contractor.businessName}?`,
          {
            name: contractor.businessName,
          },
        )}
        bodyText={t(
          'contractor.suspend.modal.message',
          `This will remove ${contractor.businessName}'s access to the Energy Savings Program application system. All employees at ${contractor.businessName} will not be able to upload invoices once suspended.`,
          { name: contractor.businessName },
        )}
        isOpen={isSuspendModalOpen}
        onClose={() => setIsSuspendModalOpen(false)}
        onSubmit={handleSuspendConfirm}
        confirmText={t('ui.confirm', 'Confirm')}
        cancelText={t('ui.cancel', 'Cancel')}
      />

      <GlobalConfirmationModal
        headerText={t(
          'contractor.unsuspend.modal.title',
          `Are you sure you want to unsuspend ${contractor.businessName}?`,
          {
            name: contractor.businessName,
          },
        )}
        bodyText={t(
          'contractor.unsuspend.modal.message',
          `This will give ${contractor.businessName} access to the Energy Savings Program application system. All employees at ${contractor.businessName} will be able to upload invoices once unsuspended.`,
          { name: contractor.businessName },
        )}
        isOpen={isUnsuspendModalOpen}
        onClose={() => setIsUnsuspendModalOpen(false)}
        onSubmit={handleUnsuspendConfirm}
        confirmText={t('ui.confirm', 'Confirm')}
        cancelText={t('ui.cancel', 'Cancel')}
      />

      <GlobalConfirmationModal
        headerText={t('contractor.remove.modal.title', `Are you sure you want to remove ${contractor.businessName}?`, {
          name: contractor.businessName,
        })}
        bodyText={t(
          'contractor.remove.modal.message',
          `This will permanently remove ${contractor.businessName} from the system. All employees at ${contractor.businessName} will lose access.`,
          { name: contractor.businessName },
        )}
        isOpen={isRemoveModalOpen}
        onClose={() => setIsRemoveModalOpen(false)}
        onSubmit={handleRemoveConfirm}
        confirmText={t('ui.confirm', 'Confirm')}
        cancelText={t('ui.cancel', 'Cancel')}
      />
    </Box>
  );
});
