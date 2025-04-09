import { Tag, TagProps } from "@chakra-ui/react"
import React from "react"
import { useTranslation } from "react-i18next"
import { IEnergySavingsApplication } from "../../../models/energy-savings-application"
import { EPermitApplicationStatus } from "../../../types/enums"

interface IEnergySavingsApplicationStatusTagProps extends TagProps {
  energySavingsApplication: IEnergySavingsApplication
}

export const EnergySavingsApplicationStatusTag = ({
  energySavingsApplication,
  ...rest
}: IEnergySavingsApplicationStatusTagProps) => {
  const { t } = useTranslation()

  const bgMap = {
    [EPermitApplicationStatus.submitted]: 'theme.orangeLight02',
    // [EPermitApplicationStatus.resubmitted]: 'theme.yellow',
    [EPermitApplicationStatus.draft]: 'theme.blueLight',
    // [EPermitApplicationStatus.revisionsRequested]: 'semantic.errorLight',
    // [EPermitApplicationStatus.ephemeral]: 'theme.blueLight',
    [EPermitApplicationStatus.inReview]: 'theme.offWhite',
    [EPermitApplicationStatus.updateNeeded]: 'semantic.errorLight',
    [EPermitApplicationStatus.approved]: 'theme.lightGreen',
    [EPermitApplicationStatus.rejected]: 'theme.blueLight',
  };

  const colorMap = {
    [EPermitApplicationStatus.submitted]: 'text.primary',
    // [EPermitApplicationStatus.resubmitted]: 'text.primary',
    [EPermitApplicationStatus.draft]: 'theme.blueButtonHover',
    // [EPermitApplicationStatus.revisionsRequested]: 'semantic.error',
    // [EPermitApplicationStatus.ephemeral]: 'text.primary',
    [EPermitApplicationStatus.inReview]: 'text.primary',
    [EPermitApplicationStatus.updateNeeded]: 'text.primary',
    [EPermitApplicationStatus.approved]: 'theme.primary',
    [EPermitApplicationStatus.rejected]: 'theme.primary',
  };

  const borderColorMap = {
    [EPermitApplicationStatus.submitted]: 'theme.orange',
    // [EPermitApplicationStatus.resubmitted]: 'theme.yellow',
    [EPermitApplicationStatus.draft]: 'greys.lightGrey',
    // [EPermitApplicationStatus.revisionsRequested]: 'semantic.errorLight',
    // [EPermitApplicationStatus.ephemeral]: 'theme.blueLight',
    [EPermitApplicationStatus.inReview]: 'theme.darkBlue',
    [EPermitApplicationStatus.updateNeeded]: 'semantic.errorDark',
    [EPermitApplicationStatus.approved]: 'theme.darkGreen',
    [EPermitApplicationStatus.rejected]: 'theme.darkBlue',
  };
  return (
    <Tag
      p={1}
      bg={bgMap[energySavingsApplication.status]}
      color={colorMap[energySavingsApplication.status]}
      fontWeight="bold"
      border="1px solid"
      borderColor={borderColorMap[energySavingsApplication.status]}
      textTransform="uppercase"
      minW="fit-content"
      textAlign="center"
      {...rest}
    >
      {/* @ts-ignore */}
      {t(`energySavingsApplication.status.${energySavingsApplication.status}`)}
    </Tag>
  );
}
