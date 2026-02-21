import { Tag, TagProps } from '@chakra-ui/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { IEnergySavingsApplication } from '../../../models/energy-savings-application';
import { EPermitApplicationStatus } from '../../../types/enums';
import { useMst } from '../../../setup/root';
import { EUserRoles } from '../../../types/enums';
import { useLocation } from 'react-router-dom';

interface IEnergySavingsApplicationStatusTagProps extends TagProps {
  energySavingsApplication: IEnergySavingsApplication | null;
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

  if (!energySavingsApplication) {
    return null;
  }

  const { status, viewedAt } = energySavingsApplication;

  const bgMap = {
    [EPermitApplicationStatus.submitted]: 'theme.orangeLight02',
    [EPermitApplicationStatus.resubmitted]: 'theme.orangeLight02',
    [EPermitApplicationStatus.draft]: 'theme.orangeLight02',
    [EPermitApplicationStatus.revisionsRequested]: 'theme.softRose',
    // [EPermitApplicationStatus.ephemeral]: 'theme.blueLight',
    [EPermitApplicationStatus.inReview]: 'theme.orangeLight02',
    [EPermitApplicationStatus.approved]: 'theme.lightGreen',
    [EPermitApplicationStatus.approvedPending]: 'theme.orangeLight02',
    [EPermitApplicationStatus.approvedPaid]: 'theme.lightGreen',
    [EPermitApplicationStatus.trainingPending]: 'theme.orangeLight02',
    [EPermitApplicationStatus.ineligible]: 'greys.grey50',
  };

  const colorMap = {
    [EPermitApplicationStatus.submitted]: 'greys.anotherGrey',
    [EPermitApplicationStatus.resubmitted]: 'greys.anotherGrey',
    [EPermitApplicationStatus.draft]: 'greys.anotherGrey',
    [EPermitApplicationStatus.revisionsRequested]: 'greys.anotherGrey',
    // [EPermitApplicationStatus.ephemeral]: 'greys.anotherGrey',
    [EPermitApplicationStatus.inReview]: 'greys.anotherGrey',
    [EPermitApplicationStatus.approved]: 'greys.anotherGrey',
    [EPermitApplicationStatus.approvedPending]: 'greys.anotherGrey',
    [EPermitApplicationStatus.approvedPaid]: 'greys.anotherGrey',
    [EPermitApplicationStatus.trainingPending]: 'greys.anotherGrey',
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
    [EPermitApplicationStatus.approvedPending]: 'theme.darkGreen',
    [EPermitApplicationStatus.approvedPaid]: 'theme.darkGreen',
    [EPermitApplicationStatus.trainingPending]: 'theme.orange',
    [EPermitApplicationStatus.ineligible]: 'border.randomBorderColorforthePublishModal',
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
      aria-label={`Submission status: ${getStatusText(status)}`}
      {...rest}
    >
      {getStatusText(status)}
    </Tag>
  );
};
