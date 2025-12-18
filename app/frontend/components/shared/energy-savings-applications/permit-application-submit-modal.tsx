import { Box, Button, Heading, HStack, Text, TextProps, VStack } from '@chakra-ui/react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { IPermitApplication } from '../../../models/energy-savings-application';
import { useMst } from '../../../setup/root';
import { GlobalConfirmationModal } from '../modals/global-confirmation-modal';

interface IProps {
  permitApplication: IPermitApplication;
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: () => void;
}

export const PermitApplicationSubmitModal = observer(function PermitApplicationSubmitModal({
  permitApplication,
  isOpen,
  onSubmit,
  onClose,
}: IProps) {
  const { userStore } = useMst();
  const currentUser = userStore.currentUser;
  const { t } = useTranslation();

  const isSupportRequest = permitApplication.submissionType.code === 'support_request' ? true : false;
  const isBeingRevised = permitApplication.status === 'revisions_requested' ? true : false;

  let headingText: string;
  let bodyText: string | null = null;

  if (isSupportRequest) {
    // support request flow
    headingText = t('energySavingsApplication.show.supportingFilesRequest.readyToUpload', {
      applicationNumber: permitApplication.incomingSupportRequests?.parentApplication?.number,
    });
    bodyText = null;
  } else if (currentUser.isContractor) {
    // contractor flow
    headingText = t('contractorOnboarding.readyContractor');
    bodyText = t('contractorOnboarding.confirmationContractor');
  } else if (currentUser.isParticipant) {
    // participant flow
    if (isBeingRevised) {
      headingText = t('energySavingsApplication.edit.revisionReady', {
        submissionType: permitApplication.submissionType.name.toLowerCase(),
      });
      bodyText = t('energySavingsApplication.edit.revisionConfirmation');
    } else {
      headingText = t('energySavingsApplication.new.ready');
      bodyText = t('energySavingsApplication.new.confirmation', {
        submissionType: permitApplication.submissionType.name.toLowerCase(),
      });
    }
  } else {
    // admin or on-behalf flow
    headingText = t('energySavingsApplication.new.onBehalf');
    bodyText = t('energySavingsApplication.new.confirmationOnBehalf');
  }

  return (
    <GlobalConfirmationModal
      headerText={headingText}
      bodyText={bodyText}
      isOpen={isOpen}
      onSubmit={onSubmit}
      onClose={onClose}
    />
  );
});
