import {
  Flex,
  Button,
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
  Grid,
  GridItem,
} from '@chakra-ui/react';
import { Download } from '@phosphor-icons/react';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SharedSpinner } from '../../shared/base/shared-spinner';
import { IEnergySavingsApplication } from '../../../models/energy-savings-application';
import { useMst } from '../../../setup/root';

export interface ISupportingFilesRequestModalProps {
  permitApplication: IEnergySavingsApplication;
  renderTrigger?: (onOpen: () => void) => React.ReactNode;
}

export const SupportingFilesRequestModal = observer(
  ({ permitApplication, renderTrigger }: ISupportingFilesRequestModalProps) => {
    const { t } = useTranslation();
    const { permitApplicationStore } = useMst();
    const triggerRef = React.useRef<HTMLButtonElement>(null);

    const requestDisclosure = useDisclosure();
    const confirmDisclosure = useDisclosure();

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
      try {
        const result = await permitApplicationStore.requestSupportingFiles(permitApplication.id, { note });

        confirmDisclosure.onClose();
        requestDisclosure.onClose();

        triggerRef.current?.focus();
      } catch (err) {
        console.error('Failed to request supporting files:', err);
        // TODO: show a toast or error state here ?
      }
    };

    return (
      <>
        {renderTrigger ? (
          renderTrigger(requestDisclosure.onOpen)
        ) : (
          <Button ref={triggerRef} variant="primary" onClick={requestDisclosure.onOpen} leftIcon={<Download />}>
            {t('energySavingsApplication.show.supportingFilesRequest.requestSupportingFiles')}
          </Button>
        )}

        <Modal
          finalFocusRef={triggerRef}
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
                    <Heading as="h1" fontSize="2xl" textTransform="capitalize">
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
                    placeholder={''}
                  />
                </ModalBody>

                <ModalFooter>
                  <Grid templateColumns="repeat(6, 1fr)" gap={2} justifyContent="center" w="full">
                    <GridItem colStart={3} colSpan={1}>
                      <PageConfirmationModal
                        onConfirm={handleConfirm}
                        applicationNumber={permitApplication.number}
                        note={note}
                      />
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
              {`Are you sure you want to request supporting files for ${applicationNumber}`}
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
