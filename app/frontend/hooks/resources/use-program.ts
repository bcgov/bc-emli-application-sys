import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { generatePath, matchPath, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useMst } from '../../setup/root';
import { isUUID } from '../../utils/utility-functions';

export const useProgram = () => {
  const { programId } = useParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { programStore, userStore } = useMst();

  const { currentUser } = userStore;

  const { currentProgram, setCurrentProgram, fetchProgram, setCurrentProgramBySlug } = programStore;

  const [error, setError] = useState<Error | undefined>(undefined);
  const { t } = useTranslation();

  const programRoutes = [
    '/submission-inbox',
    '/programs/:programId/configuration-management',
    '/programs/:programId/configuration-management/submissions-inbox-setup',
    '/programs/:programId/configuration-management/energy-step',
    '/programs/:programId/users',
    '/programs/:programId/invite',
    '/programs/:programId/api-settings',
  ];

  const findMatchingPathTemplate = (pathname) => {
    for (let route of programRoutes) {
      const match = matchPath(route, pathname);
      if (match) {
        return route;
      }
    }
    return null;
  };

  // check if this is a jurisdiction specific route
  // if it is and if the user's jurisdiction changes, navigate to the same route for the new jurisdiction
  //   useEffect(() => {
  //     if (currentUser?.isRegionalReviewManager && currentUser?.jurisdiction?.id != jurisdictionId) {
  //       const originalPath = findMatchingPathTemplate(pathname)
  //       if (!originalPath) return
  //       const path = generatePath(originalPath, { jurisdictionId: currentUser.jurisdiction.slug })
  //       navigate(path, { replace: true })
  //     }
  //   }, [currentUser?.jurisdiction])

  useEffect(() => {
    (async () => {
      try {
        if (isUUID(programId)) {
          const program = await fetchProgram(programId);
          if (program) {
            setError(null);
            setCurrentProgram(programId);
          }
        }
      } catch (e) {
        console.error(e.message);
        setError(new Error(t('errors.fetchProgram')));
      }
    })();
  }, [pathname]);

  return { currentProgram, error };
};
