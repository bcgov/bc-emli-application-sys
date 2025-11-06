import React, { useEffect } from 'react';
import { useMst } from '../../../setup/root';

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

  useEffect(() => {
    if (!currentUser.isContractor) return;
    //navigate back to welcome or somewhere;

    const init = async () => {
      const contractor = contractorStore.findByContactId(currentUser.id);

      if (!contractor) {
        const onboarding = await contractorStore.createOnboarding(currentUser.id);
        if (!onboarding.ok) {
          console.error('Error creating onboarding');
          return;
        }
        console.log(`Created onboarding application: ${onboarding.data.data.onboard_application.id}`);
        return;
      }

      const onboarding = await contractorStore.fetchOnboarding();
      //const { id, status } = onboarding.onboard_application;
      // switch (status) {
      //   case 'new_draft':
      //   case 'draft':
      //     console.log('Navigate to the Onboarding Form Edit screen');
      //     break;
      //   case 'submitted':
      //   case 'resubmitted':
      //   case 'in_review':
      //     console.log('Navigate to the Onboarding Submitted/Review screen');
      //     break;
      //   case 'approved':
      //     console.log('Navigate to the Contractor Dashboard');
      //     break;
      //   default:
      //     console.log('Onboarding was declined or ineligible');
      // }
    };

    init();
  }, [currentUser]);

  return <>Contractor Onboarding Form Creation and Loading</>;
};
