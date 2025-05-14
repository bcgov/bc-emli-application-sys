import { Tag, TagProps } from "@chakra-ui/react"
import React from "react"
import { useTranslation } from "react-i18next"
import { IEnergySavingsApplication } from '../../../models/energy-savings-application';
import { EPermitApplicationStatus } from '../../../types/enums';

interface IPermitApplicationViewedAtTagProps extends TagProps {
  permitApplication: IEnergySavingsApplication;
}

export const PermitApplicationViewedAtTag = ({ permitApplication, ...rest }: IPermitApplicationViewedAtTagProps) => {
  const { t } = useTranslation();

  console.log('permitApplication', permitApplication);

  const statusMap = {
    [EPermitApplicationStatus.inReview]: t('energySavingsApplication.status.in_review'),
    [EPermitApplicationStatus.resubmitted]: t('energySavingsApplication.status.resubmitted'),
    [EPermitApplicationStatus.ineligible]: t('energySavingsApplication.status.ineligible'),
    [EPermitApplicationStatus.approved]: t('energySavingsApplication.status.approved'),
  };
  return (
    <Tag
      p={1}
      bg={permitApplication.isViewed ? undefined : 'theme.yellow'}
      color={'text.primary'}
      fontWeight="bold"
      border="1px solid"
      borderColor="border.light"
      textTransform="uppercase"
      minW="fit-content"
      textAlign="center"
      {...rest}
    >
      {statusMap[permitApplication.status]}
    </Tag>
  );
};
