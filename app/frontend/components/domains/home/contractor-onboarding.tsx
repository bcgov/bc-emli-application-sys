import React, { useEffect, useCallback } from 'react';
import { useMst } from '../../../setup/root';
import { useLocation, useNavigate } from 'react-router-dom';
import { SharedSpinner } from '../../shared/base/shared-spinner';
import { Flex } from '@chakra-ui/react';

interface IContractorOnboardingScreenProps {}

export type TCreateEnergyApplicationFormData = {
  user_id: string;
  nickname: string;
  user_group_type: string;
  audience_type: string;
  submission_type: string;
  slug: string;
  template_version_id?: string;
};

export const ContractorOnboardingScreen = ({ ...rest }: IContractorOnboardingScreenProps) => {
  const { permitApplicationStore, userStore, uiStore, contractorStore } = useMst();
  const { currentUser } = userStore;
  const navigate = useNavigate();

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

      // Ensure contractor list is hydrated
      if (contractorStore.contractorsMap.size === 0) {
        await contractorStore.searchContractors({ reset: true });
      }

      // Find contractor linked to this user
      const contractor = contractorStore.findByContactId(currentUser.id);

      // If contractor record doesn’t exist, create onboarding (which creates contractor)
      if (!contractor) {
        onboarding = await contractorStore.createOnboarding(currentUser.id);
        if (onboarding) {
          console.log(`Created onboarding app ${onboarding.permitApplicationId}`);
          navigate(`/applications/${onboarding.permitApplicationId}/edit`);
        } else {
          console.error('Failed to create onboarding; redirecting to welcome');
          navigate('/welcome');
        }
        return;
      }

      // Otherwise, fetch latest onboarding for existing contractor
      onboarding = await contractorStore.fetchOnboarding(contractor.id);
      if (!onboarding) {
        console.error('No onboarding found; what happens here? why didnt we create one?');
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
