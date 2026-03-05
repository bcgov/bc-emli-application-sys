import { observer } from 'mobx-react-lite';
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useMst } from '../../../setup/root';

interface IProps {
  isAllowed: boolean;
  redirectPath?: string;
  children?: JSX.Element;
}
export const ProtectedRoute = observer(({ isAllowed, redirectPath = '/login', children }: IProps) => {
  const location = useLocation();
  const { sessionStore } = useMst();
  const { setAfterLoginPath } = sessionStore;

  if (!isAllowed) {
    if (!sessionStore.loggedIn) {
      // Write synchronously so the value survives the OAuth redirect.
      // makePersistable cannot be used here: it writes async and its storage key
      // requires a user ID, which is unknown pre-login.
      sessionStorage.setItem('afterLoginPath', location.pathname);
      setAfterLoginPath(location.pathname);
    }
    return <Navigate to={redirectPath || '/login'} replace />;
  }

  return children ? children : <Outlet />;
});
