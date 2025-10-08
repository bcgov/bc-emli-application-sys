import React, { useState } from 'react';
import { Box, Flex, Text, Collapse } from '@chakra-ui/react';
import { CaretUp, CaretDown } from '@phosphor-icons/react';
import { format } from 'date-fns';
import { EnergySavingsApplicationStatusTag } from './energy-savings-application-status-tag';
import { RouterLinkButton } from '../navigation/router-link-button';
import { useTranslation } from 'react-i18next';

interface LinkedApplication {
  id?: string | number;
  nickname?: string;
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
    return lines.map((line, i) => `[${line}]`).join(', ');
  };

  return (
    <>
      {supportRequests.map((sr, index) => {
        const isOpen = openIndex === index;
        const nickname = sr.linkedApplication?.nickname || 'Support Request';

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
              {isOpen ? <CaretUp size={20} /> : <CaretDown size={20} />}
            </Flex>

            {/* Collapsible Body with 2 coloum flex */}
            <Collapse in={isOpen} animateOpacity>
              <Box bg="white" px={4} py={3}>
                <Flex flexDirection={{ base: 'column', md: 'row' }} gap={6} w="full" align="flex-start">
                  {/* Left column: metadata + files (80%) */}
                  <Flex direction="column" flex={{ base: 1, md: 4 }} maxW={{ base: '100%', md: '80%' }}>
                    <Text fontSize="sm" color="gray.600">
                      Requested: {formatDate(sr.createdAt)}
                    </Text>

                    <Text fontSize="sm" mt={2}>
                      Please upload {formatFiles(sr.additionalText)}
                    </Text>
                  </Flex>

                  {/* Right column: status + button (20%) */}
                  <Flex
                    direction="column"
                    flex={{ base: 1, md: 1 }}
                    maxW={{ base: '100%', md: '20%' }}
                    align="flex-end"
                    justify="flex-start"
                    gap={2}
                  >
                    <EnergySavingsApplicationStatusTag energySavingsApplication={sr.linkedApplication} />

                    <RouterLinkButton
                      to={`/applications/${sr.linkedApplication.id}/edit`}
                      variant="secondary"
                      w={{ base: 'full', md: 'fit-content' }}
                    >
                      {t('energySavingsApplication.card.viewApplication')}
                    </RouterLinkButton>
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
