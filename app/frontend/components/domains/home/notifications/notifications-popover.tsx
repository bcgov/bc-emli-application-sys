import {
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  IconButton,
  IconButtonProps,
  ListItem,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverFooter,
  PopoverHeader,
  PopoverTrigger,
  Portal,
  Text,
  UnorderedList,
} from '@chakra-ui/react';
import { Bell, BellRinging, CaretDown, CaretRight, X } from '@phosphor-icons/react';
import { observer } from 'mobx-react-lite';
import * as R from 'ramda';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNotificationPopover } from '../../../../hooks/use-notification-popover';
import { useMst } from '../../../../setup/root';
import { CustomMessageBox } from '../../../shared/base/custom-message-box';
import { RouterLinkButton } from '../../../shared/navigation/router-link-button';

interface INotificationsPopoverProps extends IconButtonProps {}

export const NotificationsPopover: React.FC<INotificationsPopoverProps> = observer(function NotificationsPopover({
  ...rest
}) {
  const { notificationStore } = useMst();
  const {
    notifications,
    initialFetch,
    fetchNotifications,
    anyUnread,
    generateSpecificLinkData,
    getSemanticKey,
    deleteNotification,
    clearAllNotifications,
    unreadNotificationsCount,
    totalCount,
  } = notificationStore;

  useEffect(() => {
    initialFetch();
  }, [initialFetch]);

  const { isOpen, handleOpen, handleClose, numberJustRead, showRead, setShowRead, setNumberJustRead } =
    useNotificationPopover();

  // Determine which notifications to show:
  // - If showRead is true, show all notifications
  // - Otherwise, show only the first numberJustRead notifications (new ones)
  const notificationsToShow = showRead ? notifications : notifications.slice(0, numberJustRead);

  const { t } = useTranslation();

  // Fallback to notifications.length when totalCount is null (initial render)
  const shouldShowBadges = totalCount > 0 || notifications.length > 0;
  const displayedTotalCount = totalCount || notifications.length;

  const handleDeleteNotification = (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteNotification(notificationId);

    // Update numberJustRead to reflect the deletion
    if (numberJustRead > 0) {
      setNumberJustRead(numberJustRead - 1);
    }
  };

  const handleClearAllNotifications = () => {
    clearAllNotifications();
    setNumberJustRead(0);
  };

  return (
    <Popover isOpen={isOpen} onOpen={handleOpen} onClose={handleClose}>
      <PopoverTrigger>
        <Box position="relative">
          <IconButton
            variant="ghost"
            icon={anyUnread ? <BellRinging size={24} /> : <Bell size={24} />}
            aria-label="open notifications"
            zIndex={1}
            {...rest}
          />
          {anyUnread && (
            <Badge
              position="absolute"
              top={0}
              right={0}
              bg="error"
              borderRadius="50%"
              h={3}
              w={3}
              border="1px solid"
              borderColor="greys.white"
            />
          )}
        </Box>
      </PopoverTrigger>
      <Portal>
        <PopoverContent color="black" w={500}>
          <PopoverArrow />
          <PopoverCloseButton mt={1} />
          <PopoverHeader>
            <Flex gap={4} justifyContent="space-between" alignItems="center">
              <Flex gap={4} alignItems="center">
                <Heading as="h3" fontSize="lg" mb={0}>
                  {t('notification.title')}
                </Heading>
                {/* Show total count and unread count */}
                {shouldShowBadges && (
                  <Flex gap={2}>
                    <Badge fontWeight="normal" textTransform="lowercase" variant="outline">
                      {t('notification.nTotal', { count: displayedTotalCount })}
                    </Badge>
                    {numberJustRead > 0 && (
                      <Badge fontWeight="normal" textTransform="lowercase" colorScheme="blue">
                        {t('notification.nUnread', { n: numberJustRead })}
                      </Badge>
                    )}
                  </Flex>
                )}
              </Flex>
            </Flex>
          </PopoverHeader>
          <PopoverBody p={4} maxH="70vh" overflow="auto">
            <Flex direction="column" gap={4}>
              {R.isEmpty(notificationsToShow) ? (
                <Text color="greys.grey01">{t('notification.noUnread')}</Text>
              ) : (
                notificationsToShow.map((n) => (
                  <Box key={n.id} position="relative">
                    <IconButton
                      aria-label="delete notification"
                      icon={<X size={16} />}
                      size="xs"
                      variant="ghost"
                      position="absolute"
                      top={2}
                      right={2}
                      zIndex={1}
                      onClick={(e) => handleDeleteNotification(n.id, e)}
                      _hover={{ bg: 'greys.grey04' }}
                    />
                    <CustomMessageBox status={getSemanticKey(n)} description={n.actionText}>
                      <UnorderedList pl={0} mb={0}>
                        {generateSpecificLinkData(n).map((link) => (
                          <ListItem whiteSpace={'normal'} key={link.href}>
                            <RouterLinkButton
                              variant="link"
                              rightIcon={<CaretRight />}
                              to={link.href}
                              color="text.primary"
                              onClick={handleClose}
                              whiteSpace={'normal'}
                              wordBreak={'break-word'}
                            >
                              {link.text}
                            </RouterLinkButton>
                          </ListItem>
                        ))}
                      </UnorderedList>
                    </CustomMessageBox>
                  </Box>
                ))
              )}
            </Flex>
          </PopoverBody>
          <PopoverFooter border={0} padding={2} display="flex" justifyContent="space-between" alignItems="center">
            {/* "See more" button container */}
            {notifications.length > 0 &&
            ((!showRead && notifications.length > numberJustRead) ||
              (showRead && notificationStore.page < notificationStore.totalPages)) ? (
              <Button
                variant="ghost"
                leftIcon={<CaretDown />}
                onClick={showRead ? fetchNotifications : () => setShowRead(true)}
                size="sm"
              >
                {t('ui.seeMore', 'See more')}
              </Button>
            ) : (
              <Box /> /* Placeholder to keep "Clear All" on the right if "See more" is hidden */
            )}

            {/* "Clear All" button */}
            {notifications.length > 0 && (
              <Button variant="outline" colorScheme="red" size="sm" onClick={handleClearAllNotifications}>
                {t('notification.clearAll')}
              </Button>
            )}
          </PopoverFooter>
        </PopoverContent>
      </Portal>
    </Popover>
  );
});
