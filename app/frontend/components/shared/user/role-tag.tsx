import { Tag } from "@chakra-ui/react"
import React from "react"
import { useTranslation } from "react-i18next"
import { EUserRoles } from "../../../types/enums"

interface IRoleTagProps {
  role: EUserRoles
}

const roleColors: { [key in EUserRoles]: string } = {
  [EUserRoles.participant]: "transparent",
  [EUserRoles.contractor]: "transpaerent",
  [EUserRoles.participantSupportRep]: "hover.blue",
  [EUserRoles.adminManager]: "hover.blue",
  [EUserRoles.admin]: "greys.grey20",
  [EUserRoles.systemAdmin]: "transparent",
}

const roleBorderColors: { [key in EUserRoles]: string } = {
  [EUserRoles.participant]: "transparent",
  [EUserRoles.contractor]: "transpaerent",
  [EUserRoles.participantSupportRep]: "focus",
  [EUserRoles.adminManager]: "focus",
  [EUserRoles.admin]: "greys.grey90",
  [EUserRoles.systemAdmin]: "transparent",
}

export const RoleTag = ({ role }: IRoleTagProps) => {
  const color = roleColors[role]
  const borderColor = roleBorderColors[role]
  const { t } = useTranslation()
  return (
    <Tag
      p={1}
      borderRadius="sm"
      border="1px solid"
      borderColor={borderColor}
      backgroundColor={color}
      textTransform="capitalize"
      textAlign="center"
    >
      {t(`user.roles.${role}`)}
    </Tag>
  )
}
