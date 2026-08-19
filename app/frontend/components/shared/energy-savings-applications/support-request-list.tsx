import { Box, Collapse, Flex, Text } from '@chakra-ui/react';
import { CaretDown, CaretUp } from '@phosphor-icons/react';
import { format } from 'date-fns';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RouterLinkButton } from '../navigation/router-link-button';
import { EnergySavingsApplicationStatusTag } from './energy-savings-application-status-tag';

interface LinkedApplication {
  id?: string | number;
  nickname?: string;
  number?: string;
  status?: string;
  signedOffAt?: number; // epoch in ms - set when the upload form is submitted
  audienceType?: { code?: string };
}

interface SupportRequest {
  id?: string | number;
  linkedApplication?: LinkedApplication;
  createdAt?: number; // epoch in ms
  additionalText?: string; // newline-separated text
  status?: string;
}

interface SupportRequestListProps {
  supportRequests: SupportRequest[];
}

export default function SupportRequestList({ supportRequests }: SupportRequestListProps) {
  const { t } = useTranslation();
  const [openIndex, setOpenIndex] = useState<number | null>(
    supportRequests.length - 1, // open latest by default
  );

  const toggleOpen = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  // format epoch timestamp -> readable date
  const formatDate = (epoch?: number) => {
    if (!epoch) return '—';
    try {
      return format(new Date(epoch), 'MMM d, yyyy'); // e.g. "Oct 7, 2025"
    } catch {
      return 'Invalid date';
    }
  };

  // format additionalText (newline separated) into file list
  const formatFiles = (text?: string) => {
    if (!text) return '';
    const lines = text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    return lines.map((line, i) => `${line}`).join(', ');
  };

  return (
    <>
      {supportRequests.map((sr, index) => {
        const isOpen = openIndex === index;
        const nickname = sr.linkedApplication?.nickname || 'Support Request';
        // new_draft is the only draft state; every other state means the form has been submitted.
        const isDraft = sr.linkedApplication?.status === 'new_draft';
        // Internal = an admin uploaded on the participant's behalf; external = the
        // participant uploaded their own files. Same distinction the controller uses
        // to decide whether to notify.
        const isInternal = sr.linkedApplication?.audienceType?.code === 'internal';
        const fileList = formatFiles(sr.additionalText);
        // Every card carries the same nickname, so the reference number is the only
        // thing distinguishing them while collapsed.
        const referenceNumber = sr.linkedApplication?.number;

        // Drafts prompt for the upload; the pathway modal creates requests with no note,
        // so there is often no file list to name. Once submitted, the wording depends on
        // who actually uploaded.
        const bodyText = isDraft
          ? fileList
            ? t('energySavingsApplication.card.uploadFilesText', { additionalText: fileList })
            : t('energySavingsApplication.card.uploadFilesTextNoList')
          : t(
              isInternal
                ? 'energySavingsApplication.card.supportingFileSubmissionText'
                : 'energySavingsApplication.card.supportingFileParticipantSubmissionText',
            );

        return (
          <Box
            key={sr.id || index}
            width="100%"
            borderWidth="1px"
            borderRadius="md"
            overflow="hidden"
            mt={3}
            boxShadow="sm"
          >
            {/* Header Nickname Text */}
            <Flex
              align="center"
              justify="space-between"
              cursor="pointer"
              bg="var(--chakra-colors-greys-grey04)"
              px={3}
              py={2}
              onClick={() => toggleOpen(index)}
            >
              <Text fontWeight="bold" color="gray.800">
                {nickname}
              </Text>
              {/* Reference number sits right-aligned before the caret, matching where the
                  parent application card shows its own reference number. */}
              <Flex align="center" gap={3}>
                {referenceNumber && (
                  <Text fontSize="sm" color="gray.600">
                    {t('energySavingsApplication.fields.number')} {referenceNumber}
                  </Text>
                )}
                {isOpen ? <CaretUp size={20} /> : <CaretDown size={20} />}
              </Flex>
            </Flex>
            <Collapse in={isOpen} animateOpacity>
              <Box bg="white" px={4} py={3}>
                <Flex flexDirection={{ base: 'column', md: 'row' }} gap={6} w="full" align="flex-start">
                  <Flex direction="column" flex={{ base: 1, md: 4 }} maxW={{ base: '100%', md: '80%' }}>
                    <Text fontSize="sm" color="gray.600">
                      {isDraft
                        ? t('energySavingsApplication.card.requestedOn', { date: formatDate(sr.createdAt) })
                        : t('energySavingsApplication.card.submittedOn', {
                            date: formatDate(sr.linkedApplication?.signedOffAt),
                          })}
                    </Text>

                    <Text fontSize="sm" mt={2}>
                      {bodyText}
                    </Text>
                  </Flex>
                  <Flex
                    direction="column"
                    flex={{ base: 1, md: 1 }}
                    maxW={{ base: '100%', md: '20%' }}
                    align="flex-end"
                    justify="flex-start"
                    gap={2}
                  >
                    <EnergySavingsApplicationStatusTag energySavingsApplication={sr.linkedApplication} />
                    {(sr.linkedApplication?.status == 'draft' || sr.linkedApplication?.status == 'new_draft') && (
                      <RouterLinkButton
                        to={`/applications/${sr.linkedApplication.id}/edit`}
                        variant="secondary"
                        w={{ base: 'full', md: 'fit-content' }}
                      >
                        {t('energySavingsApplication.card.continueButton')}
                      </RouterLinkButton>
                    )}
                  </Flex>
                </Flex>
              </Box>
            </Collapse>
          </Box>
        );
      })}
    </>
  );
}
