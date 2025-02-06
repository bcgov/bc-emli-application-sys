import { observer } from "mobx-react-lite"
import React from "react"
import { useMst } from "../../../setup/root"
import { EUserRoles } from "../../../types/enums"
import { EnergySavingsApplicationIndexScreen } from "../energy-savings-application"
import { ReviewManagerHomeScreen } from "./review-manager"
import { ReviewerHomeScreen } from "./reviewer-home-screen"
import { SuperAdminHomeScreen } from "./super-admin-home-screen"

const roleSpecificScreens = (role: EUserRoles, props: IHomeScreenProps) => {
  return {
    [EUserRoles.superAdmin]: <SuperAdminHomeScreen {...props} />,
    [EUserRoles.reviewer]: <ReviewerHomeScreen {...props} />,
    [EUserRoles.reviewManager]: <ReviewManagerHomeScreen {...props} />,
    [EUserRoles.regionalReviewManager]: <ReviewManagerHomeScreen {...props} />,
    [EUserRoles.submitter]: <EnergySavingsApplicationIndexScreen {...props} />,
  }[role]
}

export interface IHomeScreenProps {}

export const HomeScreen = observer(({ ...props }: IHomeScreenProps) => {
  const { userStore } = useMst()
  const { currentUser } = userStore

  return roleSpecificScreens(currentUser.role, props)
})
