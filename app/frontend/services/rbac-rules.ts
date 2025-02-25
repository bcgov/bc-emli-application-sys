// Reference: https://auth0.com/blog/role-based-access-control-rbac-and-react-apps/#Role-Based-Access-Control-Example-in-React-Apps

import { IJurisdiction } from "../models/jurisdiction"
import { IUser } from "../models/user"
import { EUserRoles } from "../types/enums"

//TODO: This is find grained role based access control, need to be adjusted for new roles.
const sharedStaticRules = ["jurisdiction:view"]

const sharedDynamicRules = {
  "user:manage": (currentUser: IUser, data: { user: IUser }) => userRule(currentUser, data),
}

const reviewManagerRules = {
  static: [...sharedStaticRules, "user:invite", "application:download", "user:updateRole"],
  dynamic: {
    ...sharedDynamicRules,
    "jurisdiction:manage": (currentUser: IUser, data: { jurisdiction: IJurisdiction }) =>
      jurisdictionRule(currentUser, data),
  },
}

export const rules = {
  [EUserRoles.systemAdmin]: {
    static: [
      ...sharedStaticRules,
      "jurisdiction:create",
      "jurisdiction:manage",
      "user:invite",
      "requirementTemplate:manage",
    ],
    dynamic: { ...sharedDynamicRules },
  },
  [EUserRoles.adminManager]: reviewManagerRules,
  //[EUserRoles.regionalReviewManager]: reviewManagerRules,
  
  [EUserRoles.admin]: {
    static: [...sharedStaticRules, "user:view", "application:download"],
    dynamic: { ...sharedDynamicRules },
  },
  [EUserRoles.participant]: {
    static: [...sharedStaticRules],
    dynamic: { ...sharedDynamicRules },
  },
  ["anonymous"]: {
    static: [],
    dynamic: {},
  },
}

const userRule = (currentUser: IUser, data: { user: IUser }) => {
  const { user } = data
  return currentUser ? currentUser.id === user.id : false
}

const jurisdictionRule = (currentUser: IUser, data: { jurisdiction: IJurisdiction }) => {
  const { jurisdiction } = data
  return currentUser ? currentUser.jurisdiction.id === jurisdiction.id : false
}
