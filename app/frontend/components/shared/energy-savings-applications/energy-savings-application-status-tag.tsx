import { Tag, TagProps } from '@chakra-ui/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { IEnergySavingsApplication } from '../../../models/energy-savings-application';
import { EPermitApplicationStatus } from '../../../types/enums';

interface IEnergySavingsApplicationStatusTagProps extends TagProps {
  energySavingsApplication: IEnergySavingsApplication;
  type?: string;
}

export const EnergySavingsApplicationStatusTag = ({
  energySavingsApplication,
  type,
  ...rest
}: IEnergySavingsApplicationStatusTagProps) => {
  const { t } = useTranslation();

  const { status, viewedAt } = energySavingsApplication;

  const bgMap = {
    [EPermitApplicationStatus.submitted]: 'theme.orangeLight02',
    [EPermitApplicationStatus.resubmitted]: 'theme.yellow',
    [EPermitApplicationStatus.draft]: 'theme.blueLight',
    [EPermitApplicationStatus.revisionsRequested]: 'semantic.errorLight',
    // [EPermitApplicationStatus.ephemeral]: 'theme.blueLight',
    [EPermitApplicationStatus.inReview]: 'theme.lightGreen',
    [EPermitApplicationStatus.updateNeeded]: 'semantic.errorLight',
    [EPermitApplicationStatus.approved]: 'theme.lightGreen',
    [EPermitApplicationStatus.ineligible]: 'theme.blueLight',
    [EPermitApplicationStatus.prescreen]: 'greys.offWhite',
  };

  const colorMap = {
    [EPermitApplicationStatus.submitted]: 'text.primary',
    [EPermitApplicationStatus.resubmitted]: 'text.primary',
    [EPermitApplicationStatus.draft]: 'theme.blueButtonHover',
    [EPermitApplicationStatus.revisionsRequested]: 'semantic.error',
    // [EPermitApplicationStatus.ephemeral]: 'text.primary',
    [EPermitApplicationStatus.inReview]: 'text.primary',
    [EPermitApplicationStatus.updateNeeded]: 'text.primary',
    [EPermitApplicationStatus.approved]: 'theme.primary',
    [EPermitApplicationStatus.ineligible]: 'theme.primary',
    [EPermitApplicationStatus.prescreen]: 'theme.primary',
  };

  const borderColorMap = {
    [EPermitApplicationStatus.submitted]: 'theme.orange',
    [EPermitApplicationStatus.resubmitted]: 'theme.yellow',
    [EPermitApplicationStatus.draft]: 'greys.lightGrey',
    [EPermitApplicationStatus.revisionsRequested]: 'semantic.errorLight',
    // [EPermitApplicationStatus.ephemeral]: 'theme.blueLight',
    [EPermitApplicationStatus.inReview]: 'theme.darkGreen',
    [EPermitApplicationStatus.updateNeeded]: 'semantic.errorDark',
    [EPermitApplicationStatus.approved]: 'theme.darkGreen',
    [EPermitApplicationStatus.ineligible]: 'theme.darkBlue',
    [EPermitApplicationStatus.prescreen]: 'theme.blueText',
  };

  const getStatusText = (status: EPermitApplicationStatus) => {
    if (type === 'submission-inbox') {
      if (status === EPermitApplicationStatus.submitted) {
        return t(`energySavingsApplication.status.unread`);
      }
    }

    return t(`energySavingsApplication.status.${status}`);
  };

  return (
    <Tag
      p={1}
      bg={bgMap[status]}
      color={colorMap[status]}
      fontWeight="bold"
      border="1px solid"
      borderColor={borderColorMap[status]}
      textTransform="uppercase"
      minW="fit-content"
      textAlign="center"
      {...rest}
    >
      {getStatusText(status)}
    </Tag>
  );
};
