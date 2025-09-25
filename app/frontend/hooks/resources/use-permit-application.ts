import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { useMst } from '../../setup/root';
import { isUUID } from '../../utils/utility-functions';

export const usePermitApplication = ({ review }: { review?: boolean } = {}) => {
  const { permitApplicationId } = useParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { permitApplicationStore, sandboxStore, userStore } = useMst();
  const { currentSandbox } = sandboxStore;
  const { currentUser } = userStore;

  const { currentPermitApplication, setCurrentPermitApplication, fetchPermitApplication } = permitApplicationStore;

  const [error, setError] = useState<Error | undefined>(undefined);
  const { t } = useTranslation();

  useEffect(() => {
    (async () => {
      try {
        setCurrentPermitApplication(null);
        if (isUUID(permitApplicationId)) {
          let permitApplication = await fetchPermitApplication(permitApplicationId, review);
          if (permitApplication) {
            setCurrentPermitApplication(permitApplicationId);
            setError(null);
          } else {
            // API call failed - navigate participants back or to home
            if (currentUser?.role === 'participant') {
              if (window.history.length > 1) {
                navigate(-1); // Go back if there's history
              } else {
                navigate('/'); // Fallback to home
              }
            }
          }
        }
      } catch (e) {
        console.error(e);
        setError(new Error(t('errors.fetchPermitApplication')));
      }
    })();
  }, [pathname, currentSandbox?.id, navigate, currentUser]);

  return { currentPermitApplication, error };
};
