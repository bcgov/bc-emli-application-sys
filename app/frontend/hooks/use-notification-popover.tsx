import React, { createContext, useContext, useState, useEffect } from 'react';
import { useMst } from '../setup/root';

interface PopoverContextProps {
  isOpen: boolean;
  handleOpen: () => void;
  handleClose: () => void;
  newNotificationCount: number;
  showRead: boolean;
  setShowRead: (boolean) => void;
  setNewNotificationCount: (n: number) => void;
}

const PopoverContext = createContext<PopoverContextProps | undefined>(undefined);

interface IPopoverProvider {
  children: React.ReactNode;
}

export const PopoverProvider: React.FC<IPopoverProvider> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showRead, setShowRead] = useState<boolean>(false);
  const [newNotificationCount, setNewNotificationCount] = useState<number>(0);
  const [notificationsShownOnce, setNotificationsShownOnce] = useState<Set<string>>(new Set());

  const { notificationStore } = useMst();
  const { unreadNotificationsCount, markAllAsRead, setPopoverOpen, notifications } = notificationStore;

  // When popover is open and new notifications arrive, update newNotificationCount
  useEffect(() => {
    if (isOpen && unreadNotificationsCount > newNotificationCount) {
      setNewNotificationCount(unreadNotificationsCount);
    }
  }, [isOpen, unreadNotificationsCount, newNotificationCount]);

  const handleOpen = () => {
    setIsOpen(true);
    setPopoverOpen(true);

    // Only show notifications that haven't been shown before
    const newNotifications = notifications
      .slice(0, unreadNotificationsCount)
      .filter((n) => !notificationsShownOnce.has(n.id));
    setNewNotificationCount(newNotifications.length);

    if (unreadNotificationsCount > 0) {
      markAllAsRead();
    }

    // Reset showRead when opening to show new notifications in main area
    setShowRead(false);
  };

  const handleClose = () => {
    setIsOpen(false);
    setPopoverOpen(false);

    // Mark all notifications as read to clear the red dot
    if (unreadNotificationsCount > 0) {
      markAllAsRead();
    }

    // Mark currently shown notifications as having been shown once
    const currentlyShown = notifications.slice(0, newNotificationCount);
    const newShownOnce = new Set(notificationsShownOnce);
    currentlyShown.forEach((n) => newShownOnce.add(n.id));
    setNotificationsShownOnce(newShownOnce);

    // Clear newNotificationCount so next open shows only truly new notifications
    setNewNotificationCount(0);

    // Delay moving notifications to "see more" to avoid flash
    setTimeout(() => {
      setShowRead(true);
    }, 100);
  };

  return (
    <PopoverContext.Provider
      value={{ isOpen, handleOpen, handleClose, newNotificationCount, showRead, setShowRead, setNewNotificationCount }}
    >
      {children}
    </PopoverContext.Provider>
  );
};

export const useNotificationPopover = () => {
  const context = useContext(PopoverContext);
  if (!context) {
    throw new Error('useNotificationPopover must be used within a PopoverProvider');
  }
  return context;
};
