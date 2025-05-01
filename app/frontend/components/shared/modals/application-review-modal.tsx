import {
  Avatar,
  Box,
  Button,
  Flex,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { Warning } from '@phosphor-icons/react';
import React from 'react';
import { useTranslation } from 'react-i18next';

function ApplicationReviewModal({ isOpen, onClose }) {
  const { t } = useTranslation();
  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent maxW="sm" minW="540px">
        <ModalHeader>
          <Flex align="center" justify="space-between">
            <Text fontSize="lg" fontWeight="bold" color="theme.blueAlt">
              {t('permitApplication.review.readyToReject')}
            </Text>
          </Flex>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Alert bg="theme.orangeLight02" borderRadius="md">
            <Box ml={4}>
              <Box display="flex" alignItems="center">
                <Box color={`semantic.warning`}>{<Warning size={16} aria-label={'warning icon'} />}</Box>
                <Text fontWeight="bold" ml={2}>
                  {t('permitApplication.review.byRejecting')}
                </Text>
              </Box>

              <Text fontSize="sm" mt={2} ml={4}>
                {t('permitApplication.review.confirmReject')}
              </Text>
            </Box>
          </Alert>
        </ModalBody>

        <ModalFooter>
          <Button variant="primary" mr={3}>
            {t('ui.confirm')}
          </Button>
          <Button variant="outline" onClick={onClose}>
            {t('ui.cancel')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default ApplicationReviewModal;
