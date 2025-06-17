import React, { createContext, useContext, useState } from 'react';
import { useMst } from '../setup/root';

interface PopoverContextProps {
  isOpen: boolean;
  handleOpen: () => void;
  handleClose: () => void;
  numberJustRead: number;
  showRead: boolean;
  setShowRead: (boolean) => void;
  setNumberJustRead: (n: number) => void;
}

const PopoverContext = createContext<PopoverContextProps | undefined>(undefined);

interface IPopoverProvider {
  children: React.ReactNode;
}

export const PopoverProvider: React.FC<IPopoverProvider> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showRead, setShowRead] = useState<boolean>(false);
  const [numberJustRead, setNumberJustRead] = useState<number>(0);

  const { notificationStore } = useMst();
  const { unreadNotificationsCount, markAllAsRead, setPopoverOpen } = notificationStore;

  const handleOpen = () => {
    setIsOpen(true);
    setPopoverOpen(true);
    setNumberJustRead(unreadNotificationsCount);
    if (unreadNotificationsCount > 0) {
      markAllAsRead();
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setPopoverOpen(false);
    setShowRead(false);
  };

  return (
    <PopoverContext.Provider
      value={{ isOpen, handleOpen, handleClose, numberJustRead, showRead, setShowRead, setNumberJustRead }}
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
