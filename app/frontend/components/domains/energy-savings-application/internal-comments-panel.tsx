import { Box, Collapse, Divider, Flex, Text, VStack, useDisclosure } from '@chakra-ui/react';
import { CaretDown, CaretUp } from '@phosphor-icons/react';
import { format } from 'date-fns';
import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { IEnergySavingsApplication } from '../../../models/energy-savings-application';
import { useMst } from '../../../setup/root';

interface IInternalCommentsPanelProps {
  permitApplication: IEnergySavingsApplication;
}

// Read-only comment thread (review staff only), rendered as a collapsible card in the form column
// under the timeline box — mirrors that box's clickable-header + left-caret pattern. Hidden entirely
// when there are no comments; the header "Add comment" button is the entry point.
export const InternalCommentsPanel = observer(({ permitApplication }: IInternalCommentsPanelProps) => {
  const { t } = useTranslation();
  const { permitApplicationStore } = useMst();
  const { isOpen, onToggle } = useDisclosure({ defaultIsOpen: false });

  useEffect(() => {
    permitApplicationStore.fetchInternalComments(permitApplication.id);
  }, [permitApplication.id]);

  const comments = permitApplicationStore.getInternalComments(permitApplication.id);

  if (comments.length === 0) return null;

  return (
    <Box border="1px solid" borderColor="greys.grey01" borderRadius="lg" overflow="hidden">
      <Flex
        as="button"
        type="button"
        w="full"
        bg="greys.grey03"
        px={4}
        py={3}
        align="center"
        gap={2}
        cursor="pointer"
        textAlign="left"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={`internal-comments-${permitApplication.id}`}
      >
        <Box color="text.secondary" aria-hidden={true}>
          {isOpen ? <CaretUp size={18} /> : <CaretDown size={18} />}
        </Box>
        <Text mb={0}>
          {t('energySavingsApplication.show.internalComments.title')} ({comments.length})
        </Text>
      </Flex>

      <Collapse in={isOpen} animateOpacity>
        <Box id={`internal-comments-${permitApplication.id}`} bg="greys.grey03" px={4} pb={4}>
          <VStack
            as="ul"
            role="list"
            aria-label={t('energySavingsApplication.show.internalComments.title')}
            align="stretch"
            spacing={3}
            divider={<Divider as="li" aria-hidden="true" />}
            listStyleType="none"
            m={0}
            p={0}
          >
            {comments.map((comment) => (
              <Box as="li" role="listitem" key={comment.id}>
                <Text fontSize="sm" color="text.secondary">
                  {`${comment.user?.firstName ?? ''} ${comment.user?.lastName ?? ''}`.trim() ||
                    t('energySavingsApplication.show.internalComments.unknownAuthor')}
                  {comment.createdAt ? ` · ${format(new Date(comment.createdAt), 'yyyy-MM-dd HH:mm')}` : ''}
                </Text>
                <Text whiteSpace="pre-wrap">{comment.body}</Text>
              </Box>
            ))}
          </VStack>
        </Box>
      </Collapse>
    </Box>
  );
});
