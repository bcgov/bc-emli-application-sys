import {
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
} from '@chakra-ui/react';
import React from 'react';
import { Warning } from '@phosphor-icons/react';

function ApplicationReviewModal({
  isOpen,
  onClose,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  icon = <Warning size={27} aria-label={'warning icon'} />,
  alertBg = 'theme.orangeLight02',
  iconColor = 'theme.orange',
  width = '540px',
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent maxW="sm" minW={width}>
        <ModalHeader>
          <Flex align="center" justify="space-between">
            <Text fontSize="lg" fontWeight="bold" color="theme.blueAlt">
              {title}
            </Text>
          </Flex>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Alert bg={alertBg} borderRadius="md">
            <Box ml={4}>
              <Box display="flex" alignItems="flex-start">
                <Box color={iconColor} mt={1}>
                  {icon}
                </Box>
                <Text ml={2}>{message}</Text>
              </Box>
            </Box>
          </Alert>
        </ModalBody>

        <ModalFooter justifyContent={'center'}>
          <Button variant="primary" mr={3} onClick={onConfirm} px={8}>
            {confirmLabel}
          </Button>
          <Button variant="outline" onClick={onClose} px={8}>
            {cancelLabel}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default ApplicationReviewModal;
