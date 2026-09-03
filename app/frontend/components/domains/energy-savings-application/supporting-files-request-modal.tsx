import {
  Button,
  Flex,
  Grid,
  GridItem,
  Heading,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  Textarea,
  VStack,
  useDisclosure,
} from '@chakra-ui/react';
import { DownloadIcon } from '@phosphor-icons/react';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IEnergySavingsApplication } from '../../../models/energy-savings-application';
import { useMst } from '../../../setup/root';
import { SharedSpinner } from '../../shared/base/shared-spinner';
import { GlobalConfirmationModal } from '../../shared/modals/global-confirmation-modal';

export interface ISupportingFilesRequestModalProps {
  permitApplication: IEnergySavingsApplication;
  renderTrigger?: (onOpen: () => void) => React.ReactNode;
  // Optional controlled mode, so another component can open this modal - the pathway modal hands
  // off to it on the applicant route (BCHEP-496). Omit both and it manages itself as before.
  isOpen?: boolean;
  onClose?: () => void;
}

export const SupportingFilesRequestModal = observer(
  ({ permitApplication, renderTrigger, isOpen, onClose }: ISupportingFilesRequestModalProps) => {
    const { t } = useTranslation();
    const { permitApplicationStore } = useMst();
    const triggerRef = React.useRef<HTMLButtonElement>(null);

    const internalDisclosure = useDisclosure();
    const isControlled = isOpen !== undefined;
    const requestDisclosure = isControlled
      ? { isOpen, onOpen: () => {}, onClose: onClose ?? (() => {}) }
      : internalDisclosure;
    const confirmDisclosure = useDisclosure();
    const {
      isOpen: requestConfirmIsOpen,
      onOpen: requestConfirmOnOpen,
      onClose: requestConfirmOnClose,
    } = useDisclosure();

    // state to track textarea values
    const [note, setNote] = useState('');

    useEffect(() => {
      if (!requestDisclosure.isOpen) return;

      // reset textarea when modal opens
      setNote('');
    }, [requestDisclosure.isOpen]);

    // handle submission of the form
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();

      confirmDisclosure.onOpen(); // open confirmation
    };

    const handleConfirm = async () => {
      // requestSupportingFiles resolves false on a non-2xx rather than throwing, so the result has
      // to be checked - closing regardless left the admin believing the participant had been
      // notified when nothing was sent (BCHEP-496). The API layer surfaces the error itself; keep
      // the modal open so the typed file list is not lost.
      const result = await permitApplicationStore.requestSupportingFiles(permitApplication.id, { note });

      if (!result) {
        confirmDisclosure.onClose();
        return;
      }

      confirmDisclosure.onClose();
      requestDisclosure.onClose();

      triggerRef.current?.focus();
    };

    return (
      <>
        {/* Controlled mode has its own trigger elsewhere, so render neither the custom nor the
            default one - otherwise a stray Request supporting files button appears. */}
        {isControlled ? null : renderTrigger ? (
          renderTrigger(requestDisclosure.onOpen)
        ) : (
          <Button ref={triggerRef} variant="primary" onClick={requestDisclosure.onOpen} leftIcon={<DownloadIcon />}>
            {t('energySavingsApplication.show.supportingFilesRequest.requestSupportingFiles')}
          </Button>
        )}

        <Modal
          // Only restore focus to the trigger when this modal owns one. In controlled mode the
          // trigger lives in another component, so triggerRef is never attached and passing it
          // would send focus nowhere on close (BCHEP-496).
          finalFocusRef={isControlled ? undefined : triggerRef}
          onClose={requestDisclosure.onClose}
          isOpen={requestDisclosure.isOpen}
          scrollBehavior="inside"
        >
          <ModalOverlay />
          <ModalContent maxW={'container.md'} as="form" onSubmit={handleSubmit}>
            {' '}
            {/* form wrapper */}
            {!permitApplication?.isFullyLoaded ? (
              <SharedSpinner />
            ) : (
              <>
                <ModalHeader>
                  <VStack w="full" align="start">
                    <Heading as="h1" fontSize="2xl">
                      {t('energySavingsApplication.show.supportingFilesRequest.requestSupportingFiles')}
                      <br />
                      <Text as="span" fontSize="lg" color="text.secondary">
                        {`{#${permitApplication.number}}`}
                      </Text>
                    </Heading>
                    <Text fontSize="md" fontWeight="normal">
                      {t('energySavingsApplication.show.supportingFilesRequest.prompt')}
                    </Text>
                  </VStack>
                  <ModalCloseButton fontSize="11px" />
                </ModalHeader>

                <ModalBody>
                  <Textarea
                    name="supportingFilesNote"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={t('energySavingsApplication.show.supportingFilesRequest.listOfSupportingFiles')}
                  />
                </ModalBody>

                <ModalFooter>
                  <Grid templateColumns="repeat(6, 1fr)" gap={2} justifyContent="center" w="full">
                    <GridItem colStart={3} colSpan={1}>
                      <>
                        <Button
                          variant="primary"
                          w="full"
                          type="submit"
                          disabled={!note?.trim()}
                          onClick={requestConfirmOnOpen}
                        >
                          {t('ui.next')}
                        </Button>
                        <GlobalConfirmationModal
                          isOpen={requestConfirmIsOpen}
                          onClose={requestConfirmOnClose}
                          onSubmit={() => {
                            handleConfirm();
                            requestConfirmOnClose();
                          }}
                          //status={EFlashMessageStatus.info}
                          headerText={t('energySavingsApplication.show.supportingFilesRequest.confirmationText', {
                            applicationNumber: permitApplication.number,
                          })}
                          bodyText={undefined} // no body, only header text
                          confirmText={t('ui.confirm')}
                          cancelText={t('ui.cancel')}
                          closeOnOverlayClick={false}
                        />
                      </>
                    </GridItem>
                    <GridItem colStart={4} colSpan={1}>
                      <Button w="full" variant="secondary" onClick={requestDisclosure.onClose}>
                        {t('ui.cancel')}
                      </Button>
                    </GridItem>
                  </Grid>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
      </>
    );
  },
);

export const PageConfirmationModal = ({
  onConfirm,
  applicationNumber,
  note,
}: {
  onConfirm: () => void;
  applicationNumber: string;
  note: string;
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { t } = useTranslation();
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <>
      <Button onClick={onOpen} variant="primary" w="full" type="submit" disabled={!note?.trim()}>
        {t('ui.next')}
      </Button>

      <Modal isOpen={isOpen} onClose={onClose} size="lg" isCentered={false} motionPreset="slideInBottom">
        <ModalOverlay />
        <ModalContent p={4}>
          <ModalCloseButton />
          <ModalBody>
            <Text as="span" fontSize="lg" color="theme.blueAlt" fontWeight="bold">
              {t('energySavingsApplication.show.supportingFilesRequest.confirmationText', {
                applicationNumber: applicationNumber,
              })}
            </Text>
          </ModalBody>
          <ModalFooter>
            <Grid templateColumns="repeat(6, 1fr)" gap={2} justifyContent="center" w="full">
              <GridItem colStart={3} colSpan={1}>
                <Button variant="primary" onClick={handleConfirm}>
                  {t('ui.confirm')}
                </Button>
              </GridItem>
              <GridItem colStart={4} colSpan={1}>
                <Button variant="secondary" onClick={onClose}>
                  {t('ui.cancel')}
                </Button>
              </GridItem>
            </Grid>
            <Flex gap={4}></Flex>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};
