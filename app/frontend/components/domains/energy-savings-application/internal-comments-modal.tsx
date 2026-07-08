import {
  Box,
  Button,
  Divider,
  HStack,
  Heading,
  IconButton,
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
import { Trash } from '@phosphor-icons/react';
import { format } from 'date-fns';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IEnergySavingsApplication } from '../../../models/energy-savings-application';
import { useMst } from '../../../setup/root';
import { SharedSpinner } from '../../shared/base/shared-spinner';
import { GlobalConfirmationModal } from '../../shared/modals/global-confirmation-modal';

export interface IInternalCommentsModalProps {
  permitApplication: IEnergySavingsApplication;
  renderTrigger?: (onOpen: () => void) => React.ReactNode;
}

export const InternalCommentsModal = observer(({ permitApplication, renderTrigger }: IInternalCommentsModalProps) => {
  const { t } = useTranslation();
  const { permitApplicationStore, userStore } = useMst();
  const currentUser = userStore.currentUser;
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  const { isOpen, onOpen, onClose } = useDisclosure();
  const [body, setBody] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setBody('');
    setIsLoading(true);
    permitApplicationStore.fetchInternalComments(permitApplication.id).finally(() => setIsLoading(false));
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const result = await permitApplicationStore.createInternalComment(permitApplication.id, { body: body.trim() });
      if (result) setBody('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDeleteId) return;
    try {
      await permitApplicationStore.deleteInternalComment(permitApplication.id, pendingDeleteId);
    } finally {
      setPendingDeleteId(null);
    }
  };

  const comments = permitApplicationStore.getInternalComments(permitApplication.id);

  return (
    <>
      {renderTrigger ? (
        renderTrigger(onOpen)
      ) : (
        <Button ref={triggerRef} variant="secondary" onClick={onOpen}>
          {t('energySavingsApplication.show.internalComments.title')}
        </Button>
      )}

      <Modal finalFocusRef={triggerRef} onClose={onClose} isOpen={isOpen} scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent maxW="container.md" as="form" onSubmit={handleSubmit}>
          <ModalHeader>
            <VStack w="full" align="start" spacing={1}>
              <Heading as="h1" fontSize="2xl">
                {t('energySavingsApplication.show.internalComments.title')}
              </Heading>
              <Text fontSize="lg" color="text.secondary">
                {`#${permitApplication.number}`}
              </Text>
              <Text fontSize="md" fontWeight="normal">
                {t('energySavingsApplication.show.internalComments.prompt')}
              </Text>
            </VStack>
            <ModalCloseButton fontSize="11px" />
          </ModalHeader>

          <ModalBody>
            {isLoading ? (
              <SharedSpinner />
            ) : comments.length === 0 ? (
              <Text color="text.secondary">{t('energySavingsApplication.show.internalComments.emptyState')}</Text>
            ) : (
              <VStack align="stretch" spacing={3} divider={<Divider />}>
                {comments.map((comment) => (
                  <HStack key={comment.id} align="start" justify="space-between" spacing={2}>
                    <Box>
                      <Text fontSize="sm" color="text.secondary">
                        {`${comment.user?.firstName ?? ''} ${comment.user?.lastName ?? ''}`.trim() ||
                          t('energySavingsApplication.show.internalComments.unknownAuthor')}
                        {comment.createdAt ? ` · ${format(new Date(comment.createdAt), 'yyyy-MM-dd HH:mm')}` : ''}
                      </Text>
                      <Text whiteSpace="pre-wrap">{comment.body}</Text>
                    </Box>
                    {comment.user?.id && currentUser?.id === comment.user.id && (
                      <IconButton
                        type="button"
                        variant="ghost"
                        size="sm"
                        color="text.secondary"
                        icon={<Trash />}
                        aria-label={t('energySavingsApplication.show.internalComments.delete')}
                        onClick={() => setPendingDeleteId(comment.id)}
                      />
                    )}
                  </HStack>
                ))}
              </VStack>
            )}
          </ModalBody>

          <ModalFooter>
            <VStack w="full" align="stretch" spacing={2}>
              <Textarea
                name="internalCommentBody"
                aria-label={t('energySavingsApplication.show.internalComments.placeholder')}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={t('energySavingsApplication.show.internalComments.placeholder')}
                maxLength={5000}
              />
              <HStack alignSelf="flex-end" spacing={2}>
                <Button variant="secondary" onClick={onClose}>
                  {t('ui.close')}
                </Button>
                <Button variant="primary" type="submit" isLoading={isSubmitting} isDisabled={!body.trim()}>
                  {t('energySavingsApplication.show.internalComments.post')}
                </Button>
              </HStack>
            </VStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <GlobalConfirmationModal
        isOpen={pendingDeleteId !== null}
        onClose={() => setPendingDeleteId(null)}
        onSubmit={handleDelete}
        headerText={t('energySavingsApplication.show.internalComments.deleteConfirm')}
        bodyText={undefined}
        confirmText={t('ui.delete')}
        cancelText={t('ui.cancel')}
        closeOnOverlayClick={false}
      />
    </>
  );
});
