import {
  Box,
  Button,
  Divider,
  Flex,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react';
import { format } from 'date-fns';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMst } from '../../../setup/root';
import { IContractorStatusEvent } from '../../../types/types';

interface IStatusHistoryModalProps {
  contractorId: string;
  isOpen: boolean;
  onClose: () => void;
  // Optional heading override (e.g. "Suspension reasons" on the onboarding page).
  // Defaults to the generic "Status history" used by contractor management.
  title?: string;
}

// Read-only modal listing the permanent suspend/unsuspend/remove history for a
// contractor (backed by contractor_status_events). Fetches fresh each time it
// opens; the events are not held in the store.
export const StatusHistoryModal = observer(({ contractorId, isOpen, onClose, title }: IStatusHistoryModalProps) => {
  const { t } = useTranslation();
  const { contractorStore } = useMst();
  const [events, setEvents] = useState<IContractorStatusEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setIsLoading(true);
    setHasError(false);
    contractorStore
      .fetchStatusHistory(contractorId)
      .then((result: IContractorStatusEvent[]) => {
        if (active) setEvents(result ?? []);
      })
      .catch(() => {
        if (active) setHasError(true);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isOpen, contractorId]);

  const actorName = (event: IContractorStatusEvent) => {
    const user = event.performedBy;
    const name = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();
    return name || user?.email || t('contractor.statusHistory.unknownActor');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{title ?? t('contractor.statusHistory.title')}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {isLoading ? (
            <Flex justify="center" py={8}>
              <Spinner aria-label={t('contractor.statusHistory.loading')} />
            </Flex>
          ) : hasError ? (
            <Text color="semantic.error">{t('contractor.statusHistory.error')}</Text>
          ) : events.length === 0 ? (
            <Text color="text.secondary">{t('contractor.statusHistory.empty')}</Text>
          ) : (
            <Box border="1px solid" borderColor="border.light" borderRadius="md" p={4} maxH="55vh" overflowY="auto">
              <VStack
                as="ul"
                role="list"
                aria-label={t('contractor.statusHistory.listLabel')}
                align="stretch"
                spacing={4}
                divider={<Divider as="li" aria-hidden="true" />}
                listStyleType="none"
                m={0}
                p={0}
              >
                {events.map((event) => {
                  const eventLabel = t(`contractor.statusHistory.eventType.${event.eventType}`);
                  const actor = actorName(event);
                  const date = event.createdAt ? format(new Date(event.createdAt), 'MMM d, yyyy h:mm a') : '';
                  // Group the fragments into one phrase so a screen reader announces
                  // each entry as a single coherent item.
                  const entryAria = event.reason
                    ? t('contractor.statusHistory.entryAriaWithReason', {
                        event: eventLabel,
                        actor,
                        date,
                        reason: event.reason,
                      })
                    : t('contractor.statusHistory.entryAria', { event: eventLabel, actor, date });
                  return (
                    <Box key={event.id} as="li" role="listitem" aria-label={entryAria}>
                      {/* Visual detail is aria-hidden - the entry's aria-label above
                          already conveys it as one phrase, avoiding double reading. */}
                      <Text fontSize="sm" fontWeight="bold" mb={0} aria-hidden="true">
                        {date}:
                      </Text>
                      {event.reason ? (
                        <Text fontSize="sm" whiteSpace="pre-wrap" mt={2} mb={0} aria-hidden="true">
                          {t('contractor.statusHistory.reasonLabel')}: {event.reason}
                        </Text>
                      ) : null}
                      <Text fontSize="sm" color="text.secondary" mt={2} mb={0} aria-hidden="true">
                        {eventLabel} {t('contractor.statusHistory.byLabel')}: {actor}
                      </Text>
                    </Box>
                  );
                })}
              </VStack>
            </Box>
          )}
        </ModalBody>
        <ModalFooter justifyContent="flex-start">
          <Button variant="secondary" onClick={onClose}>
            {t('contractor.statusHistory.close')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
});
