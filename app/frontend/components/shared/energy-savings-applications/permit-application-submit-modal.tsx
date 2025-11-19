import {
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
  TextProps,
  VStack,
} from '@chakra-ui/react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { IPermitApplication } from '../../../models/energy-savings-application';
import { useMst } from '../../../setup/root';
import SandboxHeader from '../sandbox/sandbox-header';
import { WarningIcon } from '@phosphor-icons/react';
import { GlobalConfirmationModal } from '../modals/global-confirmation-modal';
import { EFlashMessageStatus } from '../../../types/enums';

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

  // const headingText = !isSupportRequest
  //   ? currentUser.isParticipant
  //     ? t('energySavingsApplication.new.ready')
  //     : t('energySavingsApplication.new.onBehalf')
  //   : t('energySavingsApplication.show.supportingFilesRequest.readyToUpload', {
  //       applicationNumber: permitApplication.incomingSupportRequests?.parentApplication?.number,
  //     });

  // const bodyText = !isSupportRequest
  //   ? currentUser.isParticipant
  //     ? t('energySavingsApplication.new.confirmation')
  //     : t('energySavingsApplication.new.confirmationOnBehalf')
  //   : null;

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
    headingText = t('energySavingsApplication.new.ready');
    bodyText = t('energySavingsApplication.new.confirmation');
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

  // return (
  //   <Modal onClose={onClose} isOpen={isOpen} size="2xl">
  //     <ModalOverlay />
  //     <ModalContent border={permitApplication.sandbox ? '8px solid' : 0} borderColor="background.sandboxBase">
  //       <ModalHeader>
  //         <ModalCloseButton fontSize="11px" />
  //         {permitApplication.sandbox && (
  //           <SandboxHeader
  //             borderTopRadius={0}
  //             borderBottomRadius="lg"
  //             top="100%"
  //             bottom={0}
  //             mx={-2}
  //             override
  //             sandbox={permitApplication.sandbox}
  //           />
  //         )}
  //       </ModalHeader>
  //       <ModalBody py={6}>
  //         {permitApplication.canUserSubmit(currentUser) ? (
  //           <Flex direction="column" gap={8}>
  //             {!isSupportRequest && (
  //               <Heading as="h3" color="theme.blueAlt">
  //                 {currentUser.isParticipant
  //                   ? t('energySavingsApplication.new.ready')
  //                   : t('energySavingsApplication.new.onBehalf')}
  //               </Heading>
  //             )}
  //             {isSupportRequest ? (
  //               <HStack spacing={4}>
  //                 <Heading fontSize={24} color="theme.blueAlt">
  //                   {t('energySavingsApplication.show.supportingFilesRequest.readyToUpload', {
  //                     applicationNumber: permitApplication.incomingSupportRequests?.parentApplication?.number,
  //                   })}
  //                 </Heading>
  //               </HStack>
  //             ) : (
  //               <Box
  //                 borderRadius="md"
  //                 border="1px solid"
  //                 borderColor="theme.orange"
  //                 backgroundColor="semantic.warningLight"
  //                 px={6}
  //                 py={3}
  //               >
  //                 <HStack spacing={4}>
  //                   <Box color={'theme.orange'} alignSelf={'start'}>
  //                     <WarningIcon size={24} aria-label={'warning icon'} />
  //                   </Box>
  //                   <Text>
  //                     {currentUser.isParticipant
  //                       ? t('energySavingsApplication.new.confirmation')
  //                       : t('energySavingsApplication.new.confirmationOnBehalf')}
  //                   </Text>
  //                 </HStack>
  //               </Box>
  //             )}
  //             <Flex justify="center" gap={6}>
  //               <Button onClick={onSubmit} variant="primary">
  //                 {isSupportRequest ? t('ui.confirm') : t('ui.submit')}
  //               </Button>
  //               <Button onClick={onClose} variant="secondary">
  //                 {t('ui.cancel')}
  //               </Button>
  //             </Flex>
  //           </Flex>
  //         ) : (
  //           <CollaboratorSubmitBlockModalContent permitApplication={permitApplication} onDismiss={onClose} />
  //         )}
  //       </ModalBody>
  //     </ModalContent>
  //   </Modal>
  // );
});

const CollaboratorSubmitBlockModalContent = observer(function CollaboratorSubmitBlockModalBodyContent({
  permitApplication,
  onDismiss,
}: {
  permitApplication: IPermitApplication;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();

  const submitter = permitApplication.submitter;
  const delegatee = permitApplication.delegatee;

  return (
    <VStack spacing={8} textAlign={'center'}>
      <Heading as="h3" fontSize={'2xl'}>
        {t('energySavingsApplication.submissionBlockModal.title')}
      </Heading>
      <Text textAlign={'center'}> {t('energySavingsApplication.submissionBlockModal.description')}</Text>

      <HStack justifyContent={'center'} w={'full'} spacing={6} alignItems={'stretch'}>
        <CollaboratorSubmitBlockModalCard
          title={t('energySavingsApplication.submissionBlockModal.designatedSubmitter')}
          name={delegatee?.name}
          organization={delegatee?.organization}
        />

        <CollaboratorSubmitBlockModalCard
          title={t('energySavingsApplication.submissionBlockModal.author')}
          name={submitter?.name}
          organization={submitter?.organization || 'some organization'}
        />
      </HStack>
      <Button
        variant={'primary'}
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
      >
        {t('ui.okay')}
      </Button>
    </VStack>
  );
});

const cardContainerProps = {
  gap: 4,
  p: 3,
  border: '1px solid',
  borderColor: 'border.light',
  borderRadius: 'sm',
  w: '50%',
  maxW: '258px',
};
const cardTextProps: Partial<TextProps> = {
  textTransform: 'uppercase',
  color: 'text.secondary',
  fontSize: 'sm',
};

function CollaboratorSubmitBlockModalCard({
  title,
  name,
  organization,
}: {
  title: string;
  name: string;
  organization?: string;
}) {
  return (
    <VStack {...cardContainerProps}>
      <Text {...cardTextProps}>{title}</Text>
      <Box>
        {name && <Text fontWeight={700}>{name}</Text>}
        {organization && <Text>{organization}</Text>}
      </Box>
    </VStack>
  );
}
