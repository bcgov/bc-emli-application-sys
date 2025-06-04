import { Tag, TagProps } from '@chakra-ui/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { IEnergySavingsApplication } from '../../../models/energy-savings-application';
import { EPermitApplicationStatus } from '../../../types/enums';
import { useMst } from '../../../setup/root';
import { EUserRoles } from '../../../types/enums';

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
  const { userStore } = useMst();
  const currentUser = userStore.currentUser;

  const { status, viewedAt } = energySavingsApplication;

  const bgMap = {
    [EPermitApplicationStatus.submitted]: 'theme.orangeLight02',
    [EPermitApplicationStatus.resubmitted]: 'theme.orangeLight02',
    [EPermitApplicationStatus.draft]: 'theme.blueLight',
    [EPermitApplicationStatus.revisionsRequested]: 'theme.softRose',
    // [EPermitApplicationStatus.ephemeral]: 'theme.blueLight',
    [EPermitApplicationStatus.inReview]: 'theme.lightGreen',
    [EPermitApplicationStatus.approved]: 'theme.lightGreen',
    [EPermitApplicationStatus.ineligible]: 'semantic.infoLight',
  };

  const colorMap = {
    [EPermitApplicationStatus.submitted]: 'text.primary',
    [EPermitApplicationStatus.resubmitted]: 'text.primary',
    [EPermitApplicationStatus.draft]: 'theme.blueButtonHover',
    [EPermitApplicationStatus.revisionsRequested]: 'text.primary',
    // [EPermitApplicationStatus.ephemeral]: 'text.primary',
    [EPermitApplicationStatus.inReview]: 'text.primary',
    [EPermitApplicationStatus.approved]: 'text.primary',
    [EPermitApplicationStatus.ineligible]: 'text.primary',
  };

  const borderColorMap = {
    [EPermitApplicationStatus.submitted]: 'theme.orange',
    [EPermitApplicationStatus.resubmitted]: 'theme.orange',
    [EPermitApplicationStatus.draft]: 'greys.lightGrey',
    [EPermitApplicationStatus.revisionsRequested]: 'semantic.errorDark',
    // [EPermitApplicationStatus.ephemeral]: 'theme.blueLight',
    [EPermitApplicationStatus.inReview]: 'theme.darkGreen',
    [EPermitApplicationStatus.approved]: 'theme.darkGreen',
    [EPermitApplicationStatus.ineligible]: 'theme.darkBlue',
  };

  const getStatusText = (status: EPermitApplicationStatus) => {
    if (
      status === EPermitApplicationStatus.submitted &&
      [EUserRoles.admin, EUserRoles.adminManager].includes(currentUser.role)
    ) {
      return t(`energySavingsApplication.status.unread`);
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
