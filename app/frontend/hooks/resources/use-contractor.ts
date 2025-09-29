import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMst } from '../../setup/root';
import { isUUID } from '../../utils/utility-functions';

export const useContractor = () => {
  const { contractorId } = useParams();
  const { pathname } = useLocation();
  const { contractorStore } = useMst();
  const { t } = useTranslation();

  const { currentContractor, setCurrentContractor, getContractor, fetchContractor } = contractorStore;

  const [error, setError] = useState<Error | undefined>(undefined);

  useEffect(() => {
    (async () => {
      try {
        if (isUUID(contractorId)) {
          // Check if contractor is already in store
          let contractor = getContractor(contractorId);

          if (!contractor) {
            // Fetch contractor data from API
            const response = await fetchContractor(contractorId);
            if (response.ok) {
              contractor = getContractor(contractorId);
            } else {
              setError(new Error(t('errors.fetchContractor')));
              return;
            }
          }

          if (contractor) {
            setError(null);
            setCurrentContractor(contractorId);
          }
        }
      } catch (e) {
        console.error(e);
        setError(new Error(t('errors.fetchContractor')));
      }
    })();
  }, [pathname, contractorId]);

  // Clean up current contractor when component unmounts or contractor changes
  useEffect(() => {
    return () => {
      if (currentContractor?.id !== contractorId) {
        setCurrentContractor(null);
      }
    };
  }, [contractorId]);

  return { currentContractor, error };
};
