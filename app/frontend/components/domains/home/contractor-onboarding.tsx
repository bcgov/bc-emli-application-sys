import React, { useEffect, useCallback, useState } from 'react';
import { useMst } from '../../../setup/root';
import { useLocation, useNavigate } from 'react-router-dom';
import { SharedSpinner } from '../../shared/base/shared-spinner';
import { Flex } from '@chakra-ui/react';
import { useSessionStorage } from '../../../hooks/use-session-state';
import { contractorOnboardingImportTokenKey } from '../../../constants';

interface IContractorOnboardingScreenProps {}

export const ContractorOnboardingScreen = ({ ...rest }: IContractorOnboardingScreenProps) => {
  const { permitApplicationStore, userStore, uiStore, contractorStore } = useMst();
  const { currentUser } = userStore;
  const navigate = useNavigate();
  const [importToken, setImportToken] = useSessionStorage(contractorOnboardingImportTokenKey, null);
  const [importHandled, setImportHandled] = useState(false);

  useEffect(() => {
    contractorStore.searchContractors();
  }, []);

  // Core onboarding logic wrapped in useCallback
  const checkOnboarding = useCallback(async () => {
    if (!currentUser) return;

    // Only contractors are allowed here
    if (!currentUser.isContractor) {
      navigate('/welcome');
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
        if (onboarding) {
          navigate(`/applications/${onboarding.permitApplicationId}/edit`);
        } else {
          navigate('/welcome');
        }
        return;
      }

      // Otherwise, fetch latest onboarding for existing contractor
      onboarding = await contractorStore.fetchOnboarding(contractor.id);
      if (!onboarding) {
        // if we got here it means we have a contractor but their onboarding is gone "withdrawn?"
        // should we even allow withdrawn?
        console.error('No onboarding found; why didnt we create one or was it withdrawn?');

        return;
      }

      // Optional: suspension/deactivation checks
      if (onboarding.suspendedAt) {
        navigate('/onboarding/suspended');
        return;
      }
      if (onboarding.deactivatedAt) {
        navigate('/onboarding/deactivated');
        return;
      }

      // Route based on onboarding status
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
      navigate('/welcome');
    }
  }, [contractorStore, currentUser, navigate]);

  // Run the check on every page load or route revisit
  useEffect(() => {
    checkOnboarding();
  }, [checkOnboarding, location.pathname]);

  return (
    <Flex justify="center" p={8}>
      <SharedSpinner />
    </Flex>
  );
};
