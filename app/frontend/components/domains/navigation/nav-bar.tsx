import {
  Box,
  Button,
  Container,
  Flex,
  HStack,
  Heading,
  Hide,
  IconButton,
  Image,
  Link,
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
} from '@chakra-ui/react';
import { Folders, List, Warning } from '@phosphor-icons/react';
import { observer } from 'mobx-react-lite';
import * as R from 'ramda';
import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { PopoverProvider, useNotificationPopover } from '../../../hooks/use-notification-popover';
import { useMst } from '../../../setup/root';
import { EUserRoles } from '../../../types/enums';
import { INotification, IPermitNotificationObjectData } from '../../../types/types';
import { HelpDrawer } from '../../shared/help-drawer';
import { RouterLink } from '../../shared/navigation/router-link';
import { RouterLinkButton } from '../../shared/navigation/router-link-button';
import SandboxHeader from '../../shared/sandbox/sandbox-header';
import { NotificationsPopover } from '../home/notifications/notifications-popover';
import { RegionalRMJurisdictionSelect } from './regional-rm-jurisdiction-select';

import { SubNavBar } from './sub-nav-bar';

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

export const NavBar = observer(function NavBar() {
  const { t } = useTranslation();
  const { sessionStore, userStore, notificationStore, uiStore, sandboxStore } = useMst();

  const { currentUser } = userStore;
  const { loggedIn, logout } = sessionStore;
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
            <Box display="flex" alignItems="center" h="100%">
              <Image
                height="80px"
                width="auto"
                maxW="280px"
                fit="contain"
                src={'/images/logo.png'}
                alt={t('site.linkHome')}
              />
            </Box>
            <Hide below="xl">
              <Flex direction="column" w="full">
                <HStack spacing={8}>
                  <Text fontSize="2xl" fontWeight="400" color="greys.anotherGrey" whiteSpace="nowrap">
                    {currentUser?.isSuperAdmin ? t('site.adminNavBarTitle') : t('site.titleLong')}
                  </Text>
                </HStack>
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
            <HStack gap={0} w="full" justify="flex-end">
              {loggedIn && <NotificationsPopover aria-label="notifications popover" color="greys.anotherGrey" />}

              {loggedIn && (
                <Hide below="md">
                  <RouterLinkButton fontSize="xl" variant="tertiary" color="greys.anotherGrey" to={'/'}>
                    {t('site.home')}
                  </RouterLinkButton>
                  {!currentUser?.isSuperAdmin && !currentUser?.isAdminManager && !currentUser?.isAdmin && (
                    <Hide below="sm">
                      <RouterLinkButton fontSize="xl" variant="tertiary" color="greys.anotherGrey" to={'/get-support'}>
                        {t('site.support.getSupport')}
                      </RouterLinkButton>
                    </Hide>
                  )}
                </Hide>
              )}

              {!loggedIn && (
                <>
                  <Hide below="sm">
                    <RouterLinkButton fontSize="xl" variant="tertiary" color="greys.anotherGrey" to={'/get-support'}>
                      {t('site.support.getSupport')}
                    </RouterLinkButton>
                  </Hide>
                  <RouterLinkButton fontSize="xl" variant="tertiary" color="greys.anotherGrey" to="/login">
                    {t('auth.login')}
                  </RouterLinkButton>
                </>
              )}

              {loggedIn && <NavBarMenu />}
            </HStack>
          </Flex>
        </Container>
      </Box>
      {!R.isEmpty(criticalNotifications) && <ActionRequiredBox notification={criticalNotifications[0]} />}

      {!shouldHideSubNavbarForPath(path) && loggedIn && <SubNavBar borderBottom={'none'} />}
    </PopoverProvider>
  );
});

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
      bg={`semantic.warningLight`}
      borderBottom="1px solid"
      borderColor={`semantic.warning`}
      p={4}
    >
      <Flex align="flex-start" gap={2} whiteSpace={'normal'}>
        <Box color={`semantic.warning`}>{<Warning size={24} aria-label={'warning icon'} />}</Box>
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

const NavBarMenu = observer(function NavBarMenu() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { sessionStore, userStore } = useMst();
  const { currentUser } = userStore;
  const { logout, loggedIn } = sessionStore;
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleClickLogout = async () => {
    await logout();
  };

  const superAdminOnlyItems = (
    <MenuGroup>
      <NavMenuItem label={t('home.permitTemplateCatalogueTitle')} to={'/requirement-templates'} />
      <NavMenuItem label={t('home.requirementsLibraryTitle')} to={'/requirements-library'} />
      <NavMenuItem label={t('home.configurationManagement.title')} to={'/configuration-management'} />
    </MenuGroup>
  );

  const reviewStaffOnlyItems = (
    <MenuGroup>
      <MenuDivider my={0} borderColor="border.light" />
    </MenuGroup>
  );

  const reviewManagerOnlyItems = (
    <MenuGroup>
      <NavMenuItem label={t('home.submissionInboxTitle')} to={'/submission-inbox'} />
      <NavMenuItem label={t('site.newApplication')} to={`/applications/new`} />
      <NavMenuItem label={t('home.viewBlankApplicationsTitle')} to={`/view-blank-applications`} />
      <NavMenuItem label={t('home.viewSupportedApplicationsTitle')} to={'/applications'} />
      <NavMenuItem label={t('home.configureUsersTitle')} to={'/configure-users'} />
    </MenuGroup>
  );

  const adminOrManagerItems = <></>;

  const reviwerOnlyItems = (
    <MenuGroup>
      <NavMenuItem label={t('home.submissionInboxTitle')} to={`/submission-inbox`} />
      <NavMenuItem label={t('site.newApplication')} to={`/applications/new`} />
      <NavMenuItem label={t('home.viewBlankApplicationsTitle')} to={`/view-blank-applications`} />
      <NavMenuItem label={t('home.viewSupportedApplicationsTitle')} to={'/applications'} />
    </MenuGroup>
  );

  const submitterOnlyItems = <></>;

  return (
    <Menu onClose={() => setIsMenuOpen(false)} onOpen={() => setIsMenuOpen(true)} computePositionOnMount>
      <Hide above="md">
        <MenuButton
          as={IconButton}
          borderRadius="lg"
          border={currentUser?.isSubmitter || !loggedIn ? 'solid black' : 'solid white'}
          borderWidth="1px"
          p={3}
          variant={currentUser?.isSubmitter || !loggedIn ? 'primaryInverse' : 'primary'}
          aria-label="menu dropdown button"
          icon={<List size={16} weight="bold" />}
        />
      </Hide>

      <Hide below="md">
        <MenuButton
          as={Button}
          borderRadius="lg"
          border="solid black"
          borderWidth="1px"
          p={3}
          variant="primaryInverse"
          aria-label="menu dropdown button"
          leftIcon={<List size={16} weight="bold" />}
          fontSize="xl"
        >
          {t('site.menu')}
        </MenuButton>
      </Hide>

      <Portal>
        <Box color="text.primary" className={isMenuOpen && 'show-menu-overlay-background'}>
          <MenuList zIndex={99} boxShadow="2xl">
            {loggedIn && !currentUser.isUnconfirmed ? (
              <>
                <Text fontSize="xs" fontStyle="italic" px={3} mb={-1} color="greys.grey01">
                  {t('site.loggedInWelcome')}
                </Text>
                <MenuGroup title={currentUser.name} noOfLines={1}>
                  <MenuDivider my={0} borderColor="border.light" />
                  <Show below="md">
                    <NavMenuItem label={t('site.home')} to={'/'} />
                  </Show>
                  {currentUser.isSuperAdmin && <NavMenuItem label={t('home.jurisdictionsTitle')} to={'/programs'} />}
                  {currentUser?.isSuperAdmin && superAdminOnlyItems}
                  {(currentUser?.isReviewManager || currentUser?.isRegionalReviewManager) && reviewManagerOnlyItems}
                  {(currentUser?.isSuperAdmin ||
                    currentUser?.isReviewManager ||
                    currentUser?.isRegionalReviewManager) &&
                    adminOrManagerItems}
                  {currentUser?.isReviewer && reviwerOnlyItems}
                  {currentUser?.isSubmitter && submitterOnlyItems}
                  {currentUser?.isReviewStaff && reviewStaffOnlyItems}

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
                  {(currentUser?.isReviewManager || currentUser?.isSuperAdmin) && (
                    <NavMenuItem label={t('home.auditLogTitle')} to={`/audit-log`} />
                  )}
                  <NavMenuItem label={t('user.myAccount')} to={'/profile'} />
                  <NavMenuItem label={t('auth.logout')} onClick={handleClickLogout} />
                </MenuGroup>
              </>
            ) : (
              <>
                {!loggedIn && (
                  <MenuList
                    display="flex"
                    flexWrap="wrap"
                    px={2}
                    py={0}
                    gap={2}
                    border="0"
                    boxShadow="none"
                    maxW="300px"
                  >
                    <NavMenuItemCTA label={t('auth.login')} to="/login" />
                  </MenuList>
                )}
                <MenuDivider my={0} borderColor="border.light" />
                <NavMenuItem label={t('site.home')} to="/" />
                <NavMenuItem label={t('home.jurisdictionsTitle')} to={'/programs/new'} />
                {loggedIn && <NavMenuItem label={t('auth.logout')} onClick={handleClickLogout} />}
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
    navigate(to);
    onClick && onClick(e);
  };

  return (
    <MenuItem as={'a'} py={2} px={3} onClick={handleClick} _hover={{ cursor: 'pointer', bg: 'hover.blue' }} {...rest}>
      <Text textAlign="left" w="full">
        {label}
      </Text>
    </MenuItem>
  );
};

// THIS IS CTA BUTTON VERSION FOR THE NAV MENU
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
