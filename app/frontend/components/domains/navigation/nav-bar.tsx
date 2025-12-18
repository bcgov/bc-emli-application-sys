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
import { useLocation, useNavigate, Link as RouterLink } from 'react-router-dom';
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

// function isSuccessfullWithdrawlPath(path: string): boolean {
//   const regex = /withdrawl-success/;
//   return regex.test(path);
// }

function isActionSuccessPath(path: string): boolean {
  const regex =
    /applications\/[a-f0-9-]{36}\/(ineligible-success|review-success|withdrawl-success|screened-in-success|successful-update)/i;

  return regex.test(path);
}

function isblankTemplatePath(path: string): boolean {
  const regex = /^\/blank-template\/([a-f\d-]+)/;
  return regex.test(path);
}

function isContractorDashboardPath(path: string): boolean {
  return path === '/contractor-dashboard';
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
    // isSuccessfullWithdrawlPath,
    isActionSuccessPath,
    isblankTemplatePath,
    isContractorDashboardPath,
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

  // Track contractor flow using sessionStorage
  React.useEffect(() => {
    if (path === '/welcome/contractor' || path === '/contractor') {
      sessionStorage.setItem('isContractorFlow', 'true');
    } else if (path === '/welcome') {
      sessionStorage.setItem('isContractorFlow', 'false');
    }
  }, [path]);

  const isContractorFlow = sessionStorage.getItem('isContractorFlow') === 'true';
  const loginPath = isContractorFlow ? '/contractor' : '/login';
  const logoPath = isContractorFlow ? '/welcome/contractor' : '/welcome';

  return (
    <PopoverProvider>
      {/* Skip Links */}
      <Link
        href="#main-content"
        position="absolute"
        left="-9999px"
        zIndex={9999}
        bg="theme.blue"
        color="white"
        px={4}
        py={2}
        borderRadius="md"
        textDecoration="none"
        _focus={{
          left: '6px',
          top: '7px',
        }}
        onClick={(e) => {
          e.preventDefault();
          const mainContent = document.getElementById('main-content');
          if (mainContent) {
            mainContent.focus();
            mainContent.scrollIntoView({ behavior: 'auto', block: 'start' });
          }
        }}
      >
        {t('a11y.skipToMainContent')}
      </Link>
      <Box
        as="header"
        role="banner"
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
        <Container maxW="1170px" h="100%" mx="auto" p={0}>
          <Flex align="center" gap={2} w="full" h="100%">
            {/* Logo */}
            <Link as={RouterLink} to={logoPath} aria-label={t('site.linkHome')} display="flex" alignItems="center">
              <Image
                height="80px"
                width="auto"
                maxW="280px"
                fit="contain"
                src={'/images/logo.png'}
                alt="Better Homes Energy Savings Program Home"
              />
            </Link>

            {loggedIn && (
              <Hide below="lg">
                <Flex direction="column" w="full">
                  <Text
                    fontSize={{ base: 'xl', lg: '2xl' }}
                    fontWeight="400"
                    color="greys.anotherGrey"
                    whiteSpace="nowrap"
                  >
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
                  <Text
                    fontSize={{ base: 'xl', lg: '2xl' }}
                    fontWeight="400"
                    color="greys.anotherGrey"
                    whiteSpace="nowrap"
                  >
                    {t('site.titleLong')}
                  </Text>
                </Flex>
                <Spacer />
              </Hide>
            )}

            <HStack gap={2} w="full" justify="flex-end">
              {/* Notifications - Logged in users only */}
              {loggedIn && <NotificationsPopover aria-label={t('notification.title')} color="greys.anotherGrey" />}

              {/* Navigation */}
              <Box as="nav" role="navigation" aria-label={t('site.mainNavigation')}>
                <HStack gap={2}>
                  {/* Desktop Links - Logged in users (lg+) */}
                  {loggedIn && (
                    <Hide below="lg">
                      <RouterLinkButton
                        fontSize={{ base: 'lg', lg: 'xl' }}
                        variant="tertiary"
                        color="greys.anotherGrey"
                        to={'/'}
                        aria-current={path === '/' ? 'page' : undefined}
                      >
                        {t('site.home')}
                      </RouterLinkButton>
                      {!currentUser?.isSuperAdmin && !currentUser?.isAdminManager && !currentUser?.isAdmin && (
                        <RouterLinkButton
                          fontSize={{ base: 'lg', lg: 'xl' }}
                          variant="tertiary"
                          color="greys.anotherGrey"
                          to={'/get-support'}
                          aria-current={path === '/get-support' ? 'page' : undefined}
                        >
                          {t('site.support.getSupport')}
                        </RouterLinkButton>
                      )}
                    </Hide>
                  )}

                  {/* Desktop Links - Non-logged in users (lg+) */}
                  {!loggedIn && (
                    <Hide below="lg">
                      <RouterLinkButton
                        fontSize={{ base: 'lg', lg: 'xl' }}
                        variant="tertiary"
                        color="greys.anotherGrey"
                        to={'/get-support'}
                        aria-current={path === '/get-support' ? 'page' : undefined}
                      >
                        {t('site.support.getSupport')}
                      </RouterLinkButton>
                      <RouterLinkButton
                        fontSize={{ base: 'lg', lg: 'xl' }}
                        variant="tertiary"
                        color="greys.anotherGrey"
                        to={loginPath}
                        aria-current={path === loginPath ? 'page' : undefined}
                      >
                        {t('auth.login')}
                      </RouterLinkButton>
                    </Hide>
                  )}

                  {/* Mobile/Desktop Menu */}
                  <NavBarMenu loginPath={loginPath} />
                </HStack>
              </Box>
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
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      direction="column"
      gap={2}
      bg="semantic.warningLight"
      borderBottom="1px solid"
      borderColor="semantic.warning"
      p={4}
    >
      <Flex align="flex-start" gap={2} whiteSpace="normal">
        <Warning size={24} color="var(--chakra-colors-semantic-warning)" aria-hidden="true" />
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
          <Link onClick={handleOpen} aria-label={t('site.reviewNotificationsLabel')}>
            {t('site.reviewNotifications')}
          </Link>
        </Flex>
      </Flex>
    </Flex>
  );
});

// ===== MENU COMPONENT ====
interface INavBarMenuProps {
  loginPath: string;
}

const NavBarMenu = observer(function NavBarMenu({ loginPath }: INavBarMenuProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { sessionStore, userStore } = useMst();
  const { currentUser } = userStore;
  const { logout, loggedIn } = sessionStore;
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleClickLogout = async () => {
    await logout();
  };

  const handleMenuKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Tab') {
      // Allow Tab key to close menu and continue navigation
      setIsMenuOpen(false);
    }
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
      <NavMenuItem label={t('site.newApplication')} to={`/new-application`} />
      <NavMenuItem label={t('home.viewBlankApplicationsTitle')} to={`/blank-applications`} />
      <NavMenuItem label={t('home.viewSupportedApplicationsTitle')} to={'/supported-applications'} />
      <NavMenuItem label={t('home.configureUsersTitle')} to={'/configure-users'} />
    </MenuGroup>
  );

  const reviewerItems = (
    <MenuGroup>
      <NavMenuItem label={t('home.submissionInboxTitle')} to={`/submission-inbox`} />
      <NavMenuItem label={t('site.newApplication')} to={`/new-application`} />
      <NavMenuItem label={t('home.viewBlankApplicationsTitle')} to={`/blank-applications`} />
      <NavMenuItem label={t('home.viewSupportedApplicationsTitle')} to={'/supported-applications'} />
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
      <Hide above="lg">
        <MenuButton
          as={IconButton}
          borderRadius="lg"
          border={loggedIn && !currentUser?.isSubmitter ? 'solid white' : 'solid black'}
          borderWidth="1px"
          p={3}
          mr={3}
          variant={loggedIn && !currentUser?.isSubmitter ? 'primary' : 'primaryInverse'}
          aria-label={isMenuOpen ? t('site.menuClose') : t('site.menuOpen')}
          aria-expanded={isMenuOpen}
          aria-haspopup="menu"
          aria-controls="main-navigation-menu"
          icon={<List size={16} weight="bold" />}
        />
      </Hide>
    );
  };

  return (
    <Menu
      closeOnSelect={true}
      placement="bottom-end"
      onOpen={() => setIsMenuOpen(true)}
      onClose={() => setIsMenuOpen(false)}
      autoSelect={false}
      computePositionOnMount={true}
    >
      {/* Unified mobile menu button */}
      {renderMenuButton()}

      {/* Desktop Menu Button - Logged in users only */}
      {loggedIn && (
        <Hide below="lg">
          <MenuButton
            as={Button}
            borderRadius="lg"
            border="solid black"
            borderWidth="1px"
            p={3}
            mr={3}
            variant="primaryInverse"
            aria-label={isMenuOpen ? t('site.menuClose') : t('site.menuOpen')}
            aria-expanded={isMenuOpen}
            aria-haspopup="menu"
            aria-controls="main-navigation-menu"
            leftIcon={<List size={16} weight="bold" />}
            fontSize={{ base: 'lg', lg: 'xl' }}
          >
            {t('site.menu')}
          </MenuButton>
        </Hide>
      )}

      {/* ===== MENU DROPDOWN ===== */}
      <Portal>
        <Box color="text.primary">
          <MenuList
            id="main-navigation-menu"
            role="menu"
            aria-label="menu-button"
            zIndex={99}
            boxShadow="2xl"
            onKeyDown={handleMenuKeyDown}
          >
            {/* ===== LOGGED IN MENU ===== */}
            {loggedIn && !currentUser?.isUnconfirmed ? (
              <>
                <MenuGroup title={currentUser?.name} noOfLines={1}>
                  {/* Role display for admin users */}
                  {(currentUser?.isSuperAdmin || currentUser?.isAdmin || currentUser?.isAdminManager) && (
                    <Box py={2} px={3} fontSize="md" color="inherit">
                      {currentUser?.isSuperAdmin
                        ? 'System admin'
                        : currentUser?.isAdminManager
                          ? 'Admin manager'
                          : 'Admin'}
                    </Box>
                  )}
                  <MenuDivider my={0} borderColor="border.light" />

                  {/* Mobile/Tablet Home Link */}
                  <Show below="lg">
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
                      <Show below="lg">
                        <MenuGroup>
                          <NavMenuItem label={t('site.support.getSupport')} to={'/get-support'} />
                          <MenuDivider my={0} borderColor="border.light" />
                        </MenuGroup>
                      </Show>
                      <MenuItem onClick={() => navigate('/new-application')} role="menuitem">
                        <Button as={Box} variant="primary" aria-label={t('site.newApplicationLabel')}>
                          {t('site.newApplication')}
                        </Button>
                      </MenuItem>
                      <MenuDivider my={0} borderColor="border.light" />
                      <NavMenuItem label={t('site.myApplications')} to="/applications" />
                    </>
                  )}

                  <MenuDivider my={0} borderColor="border.light" />

                  {/* Admin Manager items */}
                  {(currentUser?.isAdminManager || currentUser?.isAdmin || currentUser?.isSuperAdmin) && (
                    <>
                      <NavMenuItem
                        label={t('contractor.management.title', 'Manage contractor details')}
                        to={'/contractor-management'}
                      />
                      <NavMenuItem
                        label={t('contractor.programResources.title')}
                        to={'/contractor-program-resources'}
                      />
                    </>
                  )}

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
                  <NavMenuItemCTA label={t('auth.login')} to={loginPath} />
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
  onClick?: (e: any) => void;
}

const NavMenuItem = ({ label, to, onClick, ...rest }: INavMenuItemProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isCurrentPage = to && location.pathname === to;

  const handleClick = (e: any) => {
    if (to) navigate(to);
    if (onClick) onClick(e);
  };

  return (
    <MenuItem
      py={2}
      px={3}
      onClick={handleClick}
      _hover={{ bg: 'hover.blue' }}
      aria-current={isCurrentPage ? 'page' : undefined}
      fontWeight={isCurrentPage ? 'bold' : 'normal'}
      {...rest}
    >
      {label}
    </MenuItem>
  );
};

interface INavMenuItemCTAProps {
  label: string;
  to?: string;
  onClick?: (e: any) => void;
}

const NavMenuItemCTA = ({ label, to, onClick }: INavMenuItemCTAProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isCurrentPage = to && location.pathname === to;

  const handleClick = (e: any) => {
    if (to) navigate(to);
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
      aria-current={isCurrentPage ? 'page' : undefined}
      _hover={{
        bg: 'var(--chakra-colors-theme-blueAlt) !important',
        boxShadow: 'none',
      }}
    >
      {label}
    </MenuItem>
  );
};
