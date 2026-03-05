import React, { useEffect, useCallback, useState, useRef } from 'react';
import { useMst } from '../../../setup/root';
import { useLocation, useNavigate } from 'react-router-dom';
import { SharedSpinner } from '../../shared/base/shared-spinner';
import { Flex } from '@chakra-ui/react';
import { useSessionStorage } from '../../../hooks/use-session-state';
import { contractorOnboardingImportTokenKey } from '../../../constants';

interface IContractorOnboardingScreenProps {}

export const ContractorOnboardingScreen = ({ ...rest }: IContractorOnboardingScreenProps) => {
  const { permitApplicationStore, userStore, uiStore, contractorStore, sessionStore } = useMst();
  const { currentUser } = userStore;
  const navigate = useNavigate();
  const [importToken, setImportToken] = useSessionStorage(contractorOnboardingImportTokenKey, null);
  const [importHandled, setImportHandled] = useState(false);
  const cancelledRef = useRef(false);
  const deepLinkHandledRef = useRef(false);

  useEffect(() => {
    contractorStore.searchContractors();
  }, []);

  // Core onboarding logic wrapped in useCallback
  const checkOnboarding = useCallback(async () => {
    const safeNavigate = (path: string) => {
      if (!cancelledRef.current) navigate(path);
    };

    if (deepLinkHandledRef.current) return;
    if (!currentUser) return;

    // If afterLoginPath is set, the router will handle navigation after login — don't interfere.
    // Read from sessionStorage directly because MobX may not have rehydrated the store yet.
    const afterLoginPath = sessionStorage.getItem('afterLoginPath') || sessionStore.afterLoginPath;
    if (afterLoginPath) {
      deepLinkHandledRef.current = true;
      return;
    }

    // Only contractors are allowed here
    if (!currentUser.isContractor) {
      safeNavigate('/welcome');
      return;
    }

    try {
      let onboarding = null;

      // Ensure contractor list is hydrated - search ALL statuses to find user's contractor
      // Critical: Must search active, suspended, AND removed to avoid duplicate contractor creation
      if (contractorStore.contractorsMap.size === 0) {
        const originalFilter = contractorStore.statusFilter;

        // Search active contractors
        contractorStore.setStatusWithoutSearch('active');
        await contractorStore.searchContractors({ reset: true });

        // Also search suspended contractors
        contractorStore.setStatusWithoutSearch('suspended');
        await contractorStore.searchContractors({ reset: false });

        // Also search removed contractors
        contractorStore.setStatusWithoutSearch('removed');
        await contractorStore.searchContractors({ reset: false });

        // Restore original filter
        contractorStore.setStatusWithoutSearch(originalFilter);
      }

      if (importToken && !importHandled) {
        setImportHandled(true); // immediate fuse

        try {
          await contractorStore.importContractor(importToken, currentUser.id);
          setImportToken(null); // persistent cleanup
        } catch (e) {
          console.error(e);
          // setImportHandled(false) for potential retry semantics?
        }
      }

      // Find contractor linked to this user
      const contractor = await contractorStore.resolveContractorForUser(currentUser.id);

      if (!contractor) {
        // fallback to normal onboarding flow
        onboarding = await contractorStore.createOnboarding(currentUser.id);
        if (cancelledRef.current) return;
        if (onboarding) {
          navigate(`/applications/${onboarding.permitApplicationId}/edit`);
        } else {
          navigate('/welcome');
        }
        return;
      }

      // Otherwise, fetch latest onboarding for existing contractor
      onboarding = await contractorStore.fetchOnboarding(contractor.id);
      if (cancelledRef.current) return;
      if (!onboarding) {
        // if we got here it means we have a contractor but their onboarding is gone "withdrawn?"
        // should we even allow withdrawn?
        console.error('No onboarding found; why didnt we create one or was it withdrawn?');

        return;
      }

      // Optional: suspension/deactivation checks
      if (onboarding.suspendedAt) {
        safeNavigate('/onboarding/suspended');
        return;
      }
      if (onboarding.deactivatedAt) {
        safeNavigate('/onboarding/deactivated');
        return;
      }

      // Route based on onboarding status
      if (cancelledRef.current) return;
      const { onboardApplicationId, status } = onboarding;
      switch (status) {
        case 'new_draft':
          navigate(`/applications/${onboardApplicationId}/edit`);
          break;
        case 'newly_submitted':
        case 'training_pending':
          navigate(`/applications/${onboardApplicationId}/successful-submission`);
          break;
        case 'approved':
          navigate('/contractor-dashboard');
          break;
        default:
          navigate('/onboarding/ineligible');
      }
    } catch (err) {
      console.error('Onboarding init failed:', err);
      safeNavigate('/welcome');
    }
  }, [contractorStore, currentUser, navigate, sessionStore]);

  // Run the check on every page load or route revisit
  useEffect(() => {
    cancelledRef.current = false;
    checkOnboarding();
    return () => {
      cancelledRef.current = true;
    };
  }, [checkOnboarding, location.pathname]);

  return (
    <Flex justify="center" p={8}>
      <SharedSpinner />
    </Flex>
  );
};
