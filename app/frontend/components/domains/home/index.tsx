import { observer } from 'mobx-react-lite';
import React from 'react';
import { useMst } from '../../../setup/root';
import { EUserRoles } from '../../../types/enums';
import { EnergySavingsApplicationIndexScreen } from '../energy-savings-application';
import { ReviewManagerHomeScreen } from './review-manager';
import { ReviewerHomeScreen } from './reviewer-home-screen';
import { SuperAdminHomeScreen } from './super-admin-home-screen';

const roleSpecificScreens = (role: EUserRoles, props: IHomeScreenProps) => {
  return {
    [EUserRoles.systemAdmin]: <SuperAdminHomeScreen {...props} />,
    [EUserRoles.admin]: <ReviewerHomeScreen {...props} />,
    [EUserRoles.adminManager]: <ReviewManagerHomeScreen {...props} />,
    //TODO: [EUserRoles.participantSupportRep]: <ParticipantSupportRep {...props} />,
    //TODO:
    [EUserRoles.participant]: <EnergySavingsApplicationIndexScreen {...props} />,
  }[role];
};

export interface IHomeScreenProps {}

export const HomeScreen = observer(({ ...props }: IHomeScreenProps) => {
  const { userStore } = useMst();
  const { currentUser } = userStore;

  return roleSpecificScreens(currentUser.role, props);
});
