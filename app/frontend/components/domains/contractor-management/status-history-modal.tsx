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
  Tag,
  TagLabel,
  Text,
  VStack,
} from '@chakra-ui/react';
import { format } from 'date-fns';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IContractor } from '../../../models/contractor';
import { useMst } from '../../../setup/root';
import { IContractorStatusEvent, TContractorStatusEventType } from '../../../types/types';

interface IStatusHistoryModalProps {
  contractor: IContractor;
  isOpen: boolean;
  onClose: () => void;
}

// Uses the design system's semantic tokens (see styles/theme/foundations/
// colors.ts) rather than raw Chakra colorSchemes, matching the app's other
// status tags (e.g. preview-status-tag.tsx).
const EVENT_TAG_COLORS: Record<TContractorStatusEventType, { bg: string; border: string }> = {
  suspend: { bg: 'semantic.warningLight', border: 'semantic.warning' },
  unsuspend: { bg: 'semantic.successLight', border: 'semantic.success' },
  remove: { bg: 'semantic.errorLight', border: 'semantic.error' },
};

// Read-only modal listing the permanent suspend/unsuspend/remove history for a
// contractor (backed by contractor_status_events). Fetches fresh each time it
// opens; the events are not held in the store.
export const StatusHistoryModal = observer(({ contractor, isOpen, onClose }: IStatusHistoryModalProps) => {
  const { t } = useTranslation();
  const { contractorStore } = useMst();
  const [events, setEvents] = useState<IContractorStatusEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setIsLoading(true);
    contractorStore
      .fetchStatusHistory(contractor.id)
      .then((result: IContractorStatusEvent[]) => {
        if (active) setEvents(result ?? []);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isOpen, contractor.id]);

  const actorName = (event: IContractorStatusEvent) => {
    const user = event.performedBy;
    const name = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();
    return name || user?.email || t('contractor.statusHistory.unknownActor');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{t('contractor.statusHistory.title')}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Text fontSize="sm" color="text.secondary" mb={4}>
            {t('contractor.statusHistory.subtitle', { name: contractor.businessName })}
          </Text>

          {isLoading ? (
            <Flex justify="center" py={8}>
              <Spinner aria-label={t('contractor.statusHistory.loading')} />
            </Flex>
          ) : events.length === 0 ? (
            <Text color="text.secondary">{t('contractor.statusHistory.empty')}</Text>
          ) : (
            <VStack
              as="ul"
              role="list"
              aria-label={t('contractor.statusHistory.listLabel')}
              align="stretch"
              spacing={3}
              divider={<Divider />}
              listStyleType="none"
              m={0}
              p={0}
            >
              {events.map((event) => {
                const eventLabel = t(`contractor.statusHistory.eventType.${event.eventType}`);
                const actor = actorName(event);
                const date = event.createdAt ? format(new Date(event.createdAt), 'yyyy-MM-dd HH:mm') : '';
                // Group the tag/actor/date/reason fragments into one phrase so a
                // screen reader announces each entry as a single coherent item.
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
                    <Flex align="center" gap={2} mb={1} wrap="wrap" aria-hidden="true">
                      <Tag
                        size="sm"
                        borderRadius="0"
                        variant="solid"
                        bg={EVENT_TAG_COLORS[event.eventType].bg}
                        border="1px solid"
                        borderColor={EVENT_TAG_COLORS[event.eventType].border}
                        color="text.primary"
                        textTransform="uppercase"
                      >
                        <TagLabel fontWeight="bold">
                          {t(`contractor.statusHistory.eventType.${event.eventType}`)}
                        </TagLabel>
                      </Tag>
                      <Text fontSize="sm" color="text.secondary" mb={0}>
                        {actorName(event)}
                        {event.createdAt ? ` · ${format(new Date(event.createdAt), 'yyyy-MM-dd HH:mm')}` : ''}
                      </Text>
                    </Flex>
                    {event.reason ? (
                      <Text fontSize="sm" whiteSpace="pre-wrap" mb={0} aria-hidden="true">
                        <Text as="span" fontWeight="bold">
                          {t('contractor.statusHistory.reasonLabel')}:{' '}
                        </Text>
                        {event.reason}
                      </Text>
                    ) : null}
                  </Box>
                );
              })}
            </VStack>
          )}
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose}>{t('contractor.statusHistory.close')}</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
});
