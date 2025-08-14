import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  Text,
  Spinner,
  Box,
} from '@chakra-ui/react';
import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useMst } from '../../../setup/root';

interface IEulaViewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EulaViewModal: React.FC<IEulaViewModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { userStore } = useMst();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memoize fetchEula to prevent unnecessary re-renders
  const fetchEula = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await userStore.fetchEULA();
    } catch (err) {
      setError(t('ui.error'));
    } finally {
      setIsLoading(false);
    }
  }, [userStore]);

  useEffect(() => {
    if (isOpen) {
      fetchEula();
    }
  }, [isOpen, fetchEula]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered closeOnOverlayClick={false}>
      <ModalOverlay />
      <ModalContent
        maxW="800px"
        w="800px"
        maxH="90vh"
        p="40px"
        borderRadius="6px"
        boxShadow="0px 0px 2px rgba(0, 0, 0, 0.05), 0px 8px 15px rgba(0, 0, 0, 0.08)"
      >
        <ModalCloseButton
          position="absolute"
          right="5px"
          top="5px"
          w="28px"
          h="28px"
          borderRadius="4px"
          fontSize="16px"
          color="#2D2D2D"
        />

        <ModalHeader p={0} mb="24px">
          <Text fontFamily="BC Sans" fontWeight="700" fontSize="24px" lineHeight="36px" color="#005C97">
            {t('user.termsandConditions')}
          </Text>
        </ModalHeader>

        <ModalBody p={0} mb="24px" overflowY="auto" maxH="60vh">
          {isLoading && (
            <Box display="flex" justifyContent="center" alignItems="center" p={8}>
              <Spinner size="lg" color="#005C97" />
              <Text ml={4} fontFamily="BC Sans" fontSize="16px" color="#2D2D2D">
                {t('ui.loading')}
              </Text>
            </Box>
          )}

          {error && (
            <Text color="red.500" textAlign="center" p={4} fontFamily="BC Sans" fontSize="16px">
              {error}
            </Text>
          )}

          {userStore.eula && !isLoading && !error && (
            <Box
              dangerouslySetInnerHTML={{ __html: userStore.eula.content }}
              sx={{
                fontFamily: 'BC Sans',
                fontSize: '16px',
                lineHeight: '27px',
                color: '#2D2D2D',
                '& p': { marginBottom: '1rem' },
                '& ul': { marginBottom: '1rem', paddingLeft: '1.5rem' },
                '& li': { marginBottom: '0.5rem' },
                '& b, & strong': { fontWeight: '700' },
                '& a': {
                  color: '#005C97',
                  textDecoration: 'underline',
                  '&:hover': { color: '#003f68' },
                },
                '& h1, & h2, & h3': {
                  fontFamily: 'BC Sans',
                  fontWeight: '700',
                  color: '#005C97',
                  marginBottom: '1rem',
                  marginTop: '1.5rem',
                },
              }}
            />
          )}

          {!isLoading && !error && !userStore.eula && (
            <Text textAlign="center" p={4} fontFamily="BC Sans" fontSize="16px" color="#2D2D2D">
              {t('ui.noDataFound', 'No data found.')}
            </Text>
          )}
        </ModalBody>

        <ModalFooter p={0} justifyContent="flex-end">
          <Button
            onClick={onClose}
            bg="#005C97"
            color="white"
            fontFamily="BC Sans"
            fontWeight="700"
            fontSize="16px"
            borderRadius="4px"
            px="24px"
            py="12px"
            _hover={{ bg: '#003f68' }}
            _active={{ bg: '#003f68' }}
          >
            {t('ui.close')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
