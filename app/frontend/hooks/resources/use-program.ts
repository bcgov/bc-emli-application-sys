import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { generatePath, matchPath, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useMst } from '../../setup/root';
import { isUUID } from '../../utils/utility-functions';

export const useProgram = () => {
  const { programId } = useParams();
  console.log('programId use-program.ts ' + programId); // Logs the programID from the URL
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { programStore, userStore } = useMst();

  const { currentUser } = userStore;

  const { currentProgram, setCurrentProgram, fetchProgram, setCurrentProgramBySlug } = programStore;

  const [error, setError] = useState<Error | undefined>(undefined);
  const { t } = useTranslation();

  const programRoutes = [
    '/programs/:programId/submission-inbox',
    '/programs/:programId/configuration-management',
    '/programs/:programId/configuration-management/submissions-inbox-setup',
    '/programs/:programId/configuration-management/energy-step',
    '/programs/:programId/users',
    '/programs/:programId/users/invite',
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

  // check if this is a program specific route
  // if it is and if the user's program changes, navigate to the same route for the new program
  useEffect(() => {
    if (currentUser?.isRegionalReviewManager && currentUser?.program?.id != programId) {
      const originalPath = findMatchingPathTemplate(pathname);
      if (!originalPath) return;
      const path = generatePath(originalPath, { programId: currentUser.program.slug });
      navigate(path, { replace: true });
    }
  }, [currentUser?.program]);

  useEffect(() => {
    (async () => {
      try {
        if (isUUID(programId)) {
          const program = await fetchProgram(programId);
          if (program) {
            setError(null);
            setCurrentProgram(programId);
          }
        } else {
          //assume slug
          const program = await fetchProgram(programId);
          if (program) {
            setError(null);
            setCurrentProgramBySlug(programId);
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
