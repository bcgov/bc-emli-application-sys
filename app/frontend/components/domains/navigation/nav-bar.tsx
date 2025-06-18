import {
  Box,
  Button,
  Container,
  Flex,
  HStack,
  Hide,
  IconButton,
  Image,
  Menu,
  MenuButton,
  MenuDivider,
  MenuGroup,
  MenuItem,
  MenuItemProps,
  MenuList,
  Portal,
  Show,
  Spacer,
  Text,
  Heading,
  Link,
} from '@chakra-ui/react';
import { List, Warning } from '@phosphor-icons/react';
import { observer } from 'mobx-react-lite';
import * as R from 'ramda';
import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { PopoverProvider, useNotificationPopover } from '../../../hooks/use-notification-popover';
import { useMst } from '../../../setup/root';
import { INotification, IPermitNotificationObjectData } from '../../../types/types';
import { RouterLinkButton } from '../../shared/navigation/router-link-button';
import SandboxHeader from '../../shared/sandbox/sandbox-header';
import { NotificationsPopover } from '../home/notifications/notifications-popover';
import { SubNavBar } from './sub-nav-bar';

// ===== PATH UTILITIES =====
function isTemplateEditPath(path: string): boolean {
  const regex = /^\/requirement-templates\/([a-f\d-]+)\/edit$/;
  return regex.test(path);
}

function isEarlyAccessTemplateEditPath(path: string): boolean {
  const regex = /^\/early-access?\/requirement-templates\/([a-f\d-]+)\/edit$/;
  return regex.test(path);
}

function isEarlyAccessTemplateViewPath(path: string): boolean {
  const regex = /^\/early-access\/requirement-templates\/([a-f\d-]+)$/;
  return regex.test(path);
}

function isDigitalPermitEditPath(path: string): boolean {
  const regex = /^\/digital-building-permits\/([a-f\d-]+)\/edit$/;
  return regex.test(path);
}

function isTemplateVersionPath(path: string): boolean {
  const regex = /^\/template-versions\/([a-f\d-]+)$/;
  return regex.test(path);
}

function isPermitApplicationPath(path: string): boolean {
  const regex = /^\/permit-applications\/([a-f\d-]+)/;
  return regex.test(path);
}

function isPermitApplicationEditPath(path: string): boolean {
  const regex = /^\/applications\/([a-f\d-]+)\/edit.*$/;
  return regex.test(path);
}

function isApiMappingPath(path: string): boolean {
  const regex = /^(\/jurisdictions\/[a-z\d-]+)?\/api-settings\/api-mappings.*$/;
  return regex.test(path);
}

function isRejectionPath(path: string): boolean {
  const regex = /rejection-reason/;
  return regex.test(path);
}

function isSuccessfullSubmissionPath(path: string): boolean {
  const regex = /applications\/[a-f0-9-]{36}\/successful-submission/;
  return regex.test(path);
}

function isSuccessfullWithdrawlPath(path: string): boolean {
  const regex = /withdrawl-success/;
  return regex.test(path);
}

function shouldHideSubNavbarForPath(path: string): boolean {
  const matchers: Array<(path: string) => boolean> = [
    (path) => path === '/',
    isTemplateEditPath,
    isEarlyAccessTemplateEditPath,
    isEarlyAccessTemplateViewPath,
    isTemplateVersionPath,
    isPermitApplicationEditPath,
    isPermitApplicationPath,
    isDigitalPermitEditPath,
    isApiMappingPath,
    isRejectionPath,
    isSuccessfullSubmissionPath,
    isSuccessfullWithdrawlPath,
  ];

  return matchers.some((matcher) => matcher(path));
}

// ===== MAIN NAVBAR COMPONENT =====
export const NavBar = observer(function NavBar() {
  const { t } = useTranslation();
  const { sessionStore, userStore, notificationStore } = useMst();
  const { currentUser } = userStore;
  const { loggedIn } = sessionStore;
  const { criticalNotifications } = notificationStore;
  const location = useLocation();
  const path = location.pathname;

  return (
    <PopoverProvider>
      <Box
        as="nav"
        id="mainNav"
        w="full"
        maxW="100%"
        color={'greys.anotherGrey'}
        zIndex={10}
        borderBottomWidth={1}
        borderColor="border.light"
        shadow="none"
        minH="80px"
        display="flex"
        alignItems="center"
      >
        <Container maxW="container.lg" h="100%" mx="auto" p={0}>
          <Flex align="center" gap={2} w="full" h="100%">
            {/* Logo */}
            <Image
              height="80px"
              width="auto"
              maxW="280px"
              fit="contain"
              src={'/images/logo.png'}
              alt={t('site.linkHome')}
            />

            {loggedIn && (
              <Hide below="xl">
                <Flex direction="column" w="full">
                  <Text fontSize="2xl" fontWeight="400" color="greys.anotherGrey" whiteSpace="nowrap">
                    {currentUser?.isSuperAdmin ? t('site.adminNavBarTitle') : t('site.titleLong')}
                  </Text>
                  {currentUser?.isReviewStaff && (
                    <SandboxHeader
                      justify="center"
                      align="center"
                      position="static"
                      borderTopRadius={0}
                      mb={-2}
                      color="text.primary"
                      expanded
                    />
                  )}
                </Flex>
                <Spacer />
              </Hide>
            )}

            {!loggedIn && (
              <Hide below="lg">
                <Flex direction="column" w="full">
                  <Text fontSize="2xl" fontWeight="400" color="greys.anotherGrey" whiteSpace="nowrap">
                    {t('site.titleLong')}
                  </Text>
                </Flex>
                <Spacer />
              </Hide>
            )}

            <HStack gap={2} w="full" justify="flex-end">
              {/* Notifications - Logged in users only */}
              {loggedIn && <NotificationsPopover aria-label="notifications popover" color="greys.anotherGrey" />}

              {/* Desktop Links - Logged in users (md+) */}
              {loggedIn && (
                <Hide below="md">
                  <RouterLinkButton fontSize="xl" variant="tertiary" color="greys.anotherGrey" to={'/'}>
                    {t('site.home')}
                  </RouterLinkButton>
                  {!currentUser?.isSuperAdmin && !currentUser?.isAdminManager && !currentUser?.isAdmin && (
                    <RouterLinkButton fontSize="xl" variant="tertiary" color="greys.anotherGrey" to={'/get-support'}>
                      {t('site.support.getSupport')}
                    </RouterLinkButton>
                  )}
                </Hide>
              )}

              {/* Desktop Links - Non-logged in users (md+) */}
              {!loggedIn && (
                <Hide below="md">
                  <RouterLinkButton fontSize="xl" variant="tertiary" color="greys.anotherGrey" to={'/get-support'}>
                    {t('site.support.getSupport')}
                  </RouterLinkButton>
                  <RouterLinkButton fontSize="xl" variant="tertiary" color="greys.anotherGrey" to="/login">
                    {t('auth.login')}
                  </RouterLinkButton>
                </Hide>
              )}

              {/* Mobile/Desktop Menu */}
              <NavBarMenu />
            </HStack>
          </Flex>
        </Container>
      </Box>

      {/* Critical Notifications */}
      {!R.isEmpty(criticalNotifications) && <ActionRequiredBox notification={criticalNotifications[0]} />}

      {/* Sub Navigation */}
      {!shouldHideSubNavbarForPath(path) && loggedIn && <SubNavBar borderBottom={'none'} />}
    </PopoverProvider>
  );
});

// ===== ACTION REQUIRED BOX =====
interface IActionRequiredBoxProps {
  notification: INotification;
}

const ActionRequiredBox: React.FC<IActionRequiredBoxProps> = observer(({ notification }) => {
  const { notificationStore } = useMst();
  const { generateSpecificLinkData } = notificationStore;
  const { t } = useTranslation();
  const linkData = generateSpecificLinkData(notification);
  const { handleOpen } = useNotificationPopover();

  return (
    <Flex
      direction="column"
      gap={2}
      bg="semantic.warningLight"
      borderBottom="1px solid"
      borderColor="semantic.warning"
      p={4}
    >
      <Flex align="flex-start" gap={2} whiteSpace="normal">
        <Warning size={24} color="var(--chakra-colors-semantic-warning)" aria-label="warning icon" />
        <Flex direction="column" gap={2}>
          <Heading as="h3" fontSize="md">
            {t('ui.actionRequired')}
          </Heading>
          <Text>
            <Trans
              i18nKey={`site.actionRequired.${notification.actionType}`}
              number={(notification.objectData as IPermitNotificationObjectData).permitApplicationNumber}
              components={{
                1: (
                  <Link href={linkData[0].href}>
                    {(notification.objectData as IPermitNotificationObjectData).permitApplicationNumber}
                  </Link>
                ),
              }}
            />
          </Text>
          <Link onClick={handleOpen}>{t('site.reviewNotifications')}</Link>
        </Flex>
      </Flex>
    </Flex>
  );
});

// ===== MENU COMPONENT =====
const NavBarMenu = observer(function NavBarMenu() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { sessionStore, userStore } = useMst();
  const { currentUser } = userStore;
  const { logout, loggedIn } = sessionStore;

  const handleClickLogout = async () => {
    await logout();
  };

  // ===== MENU ITEMS BY ROLE =====
  const superAdminItems = (
    <MenuGroup>
      <NavMenuItem label={t('home.permitTemplateCatalogueTitle')} to={'/requirement-templates'} />
      <NavMenuItem label={t('home.requirementsLibraryTitle')} to={'/requirements-library'} />
      <NavMenuItem label={t('home.configurationManagement.title')} to={'/configuration-management'} />
    </MenuGroup>
  );

  const reviewManagerItems = (
    <MenuGroup>
      <NavMenuItem label={t('home.submissionInboxTitle')} to={'/submission-inbox'} />
      <NavMenuItem label={t('site.newApplication')} to={`/applications/new`} />
      <NavMenuItem label={t('home.viewBlankApplicationsTitle')} to={`/blank-applications`} />
      <NavMenuItem label={t('home.viewSupportedApplicationsTitle')} to={'/applications'} />
      <NavMenuItem label={t('home.configureUsersTitle')} to={'/configure-users'} />
    </MenuGroup>
  );

  const reviewerItems = (
    <MenuGroup>
      <NavMenuItem label={t('home.submissionInboxTitle')} to={`/submission-inbox`} />
      <NavMenuItem label={t('site.newApplication')} to={`/applications/new`} />
      <NavMenuItem label={t('home.viewBlankApplicationsTitle')} to={`/view-blank-applications`} />
      <NavMenuItem label={t('home.viewSupportedApplicationsTitle')} to={'/applications'} />
    </MenuGroup>
  );

  const reviewStaffItems = (
    <MenuGroup>
      <MenuDivider my={0} borderColor="border.light" />
    </MenuGroup>
  );

  // Combine the menu button rendering logic
  const renderMenuButton = () => {
    return (
      <Hide above="md">
        <MenuButton
          as={IconButton}
          borderRadius="lg"
          border={loggedIn && !currentUser?.isSubmitter ? 'solid white' : 'solid black'}
          borderWidth="1px"
          p={3}
          mr={3}
          variant={loggedIn && !currentUser?.isSubmitter ? 'primary' : 'primaryInverse'}
          aria-label="menu dropdown button"
          icon={<List size={16} weight="bold" />}
        />
      </Hide>
    );
  };

  return (
    <Menu closeOnSelect={true} placement="bottom-end">
      {/* Unified mobile menu button */}
      {renderMenuButton()}

      {/* Desktop Menu Button - Logged in users only */}
      {loggedIn && (
        <Hide below="md">
          <MenuButton
            as={Button}
            borderRadius="lg"
            border="solid black"
            borderWidth="1px"
            p={3}
            mr={3}
            variant="primaryInverse"
            aria-label="menu dropdown button"
            leftIcon={<List size={16} weight="bold" />}
            fontSize="xl"
          >
            {t('site.menu')}
          </MenuButton>
        </Hide>
      )}

      {/* ===== MENU DROPDOWN ===== */}
      <Portal>
        <Box color="text.primary">
          <MenuList zIndex={99} boxShadow="2xl">
            {/* ===== LOGGED IN MENU ===== */}
            {loggedIn && !currentUser?.isUnconfirmed ? (
              <>
                <Text fontSize="xs" fontStyle="italic" px={3} mb={-1} color="greys.grey01">
                  {t('site.loggedInWelcome')}
                </Text>
                <MenuGroup title={currentUser.name} noOfLines={1}>
                  <MenuDivider my={0} borderColor="border.light" />

                  {/* Mobile Home Link */}
                  <Show below="md">
                    <NavMenuItem label={t('site.home')} to={'/'} />
                  </Show>

                  {/* Role-based menu items */}
                  {currentUser.isSuperAdmin && <NavMenuItem label={t('home.jurisdictionsTitle')} to={'/programs'} />}
                  {currentUser?.isSuperAdmin && superAdminItems}
                  {(currentUser?.isReviewManager || currentUser?.isRegionalReviewManager) && reviewManagerItems}
                  {currentUser?.isReviewer && reviewerItems}
                  {currentUser?.isReviewStaff && reviewStaffItems}

                  {/* Participants specific items */}
                  {currentUser?.isSubmitter && (
                    <>
                      <Show below="md">
                        <MenuGroup>
                          <NavMenuItem label={t('site.support.getSupport')} to={'/get-support'} />
                          <MenuDivider my={0} borderColor="border.light" />
                        </MenuGroup>
                      </Show>
                      <MenuItem onClick={(e) => navigate('/applications/new')}>
                        <Button as={Box} variant="primary">
                          {t('site.newApplication')}
                        </Button>
                      </MenuItem>
                      <MenuDivider my={0} borderColor="border.light" />
                      <NavMenuItem label={t('site.myApplications')} to="/applications" />
                    </>
                  )}

                  <MenuDivider my={0} borderColor="border.light" />

                  {/* Admin-only items */}
                  {(currentUser?.isReviewManager || currentUser?.isSuperAdmin) && (
                    <NavMenuItem label={t('home.auditLogTitle')} to={`/audit-log`} />
                  )}

                  {/* Common logged-in items */}
                  <NavMenuItem label={t('user.myAccount')} to={'/profile'} />
                  <NavMenuItem label={t('auth.logout')} onClick={handleClickLogout} />
                </MenuGroup>
              </>
            ) : (
              /* ===== NON-LOGGED IN MENU ===== */
              <>
                <MenuList display="flex" flexWrap="wrap" px={2} py={0} gap={2} border="0" boxShadow="none" maxW="300px">
                  <NavMenuItemCTA label={t('auth.login')} to="/login" />
                </MenuList>
                <MenuDivider my={0} borderColor="border.light" />
                <NavMenuItem label={t('site.support.getSupport')} to="/get-support" />
              </>
            )}
          </MenuList>
        </Box>
      </Portal>
    </Menu>
  );
});

// Looks complicated but this is just how you make it so that either to or onClick must be given, but not necessarily both
interface INavMenuItemProps extends MenuItemProps {
  label: string;
  to?: string;
  onClick?: (any) => void;
}

const NavMenuItem = ({ label, to, onClick, ...rest }: INavMenuItemProps) => {
  const navigate = useNavigate();

  const handleClick = (e) => {
    if (to) navigate(to);
    if (onClick) onClick(e);
  };

  return (
    <MenuItem py={2} px={3} onClick={handleClick} _hover={{ cursor: 'pointer', bg: 'hover.blue' }} {...rest}>
      {label}
    </MenuItem>
  );
};

interface INavMenuItemCTAProps {
  label: string;
  to?: string;
  onClick?: (any) => void;
}

const NavMenuItemCTA = ({ label, to, onClick }: INavMenuItemCTAProps) => {
  const navigate = useNavigate();

  const handleClick = (e) => {
    navigate(to);
    onClick && onClick(e);
  };

  return (
    <MenuItem
      as={'a'}
      flex={1}
      onClick={handleClick}
      style={{
        color: 'var(--chakra-colors-greys-white)',
        background: 'var(--chakra-colors-theme-blue)',
        borderRadius: 'var(--chakra-radii-small)',
        width: 'auto',
      }}
      display={'flex'}
      justifyContent={'center'}
      _hover={{
        bg: 'var(--chakra-colors-theme-blueAlt) !important',
        boxShadow: 'none',
      }}
    >
      {label}
    </MenuItem>
  );
};
