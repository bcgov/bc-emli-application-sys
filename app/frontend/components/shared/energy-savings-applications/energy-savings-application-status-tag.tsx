import { Tag, TagProps } from '@chakra-ui/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { IEnergySavingsApplication } from '../../../models/energy-savings-application';
import { EPermitApplicationStatus } from '../../../types/enums';
import { useMst } from '../../../setup/root';
import { EUserRoles } from '../../../types/enums';
import { useLocation } from 'react-router-dom';

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
  const { pathname } = useLocation();
  const isSupportedApplication = pathname === '/supported-applications';

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
    [EPermitApplicationStatus.submitted]: 'greys.anotherGrey',
    [EPermitApplicationStatus.resubmitted]: 'greys.anotherGrey',
    [EPermitApplicationStatus.draft]: 'greys.anotherGrey',
    [EPermitApplicationStatus.revisionsRequested]: 'greys.anotherGrey',
    // [EPermitApplicationStatus.ephemeral]: 'greys.anotherGrey',
    [EPermitApplicationStatus.inReview]: 'greys.anotherGrey',
    [EPermitApplicationStatus.approved]: 'greys.anotherGrey',
    [EPermitApplicationStatus.ineligible]: 'greys.anotherGrey',
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
      [EUserRoles.admin, EUserRoles.adminManager].includes(currentUser.role) &&
      !isSupportedApplication
    ) {
      return t(`energySavingsApplication.status.unread`);
    }
    if (status === EPermitApplicationStatus.inReview && currentUser.isParticipant) {
      return t(`energySavingsApplication.statusGroup.underReview`);
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
