import React from 'react';
import { Box, Button, Center, Flex, Icon, Input, Text, Textarea, VStack, useColorModeValue } from '@chakra-ui/react';
import { WarningCircle } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

const RejectApplicationScreen = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  return (
    <VStack spacing={6} p={8} bg="white">
      <VStack spacing={4} align="center" textAlign="center">
        <Icon as={WarningCircle} boxSize={10} color="orange.400" />
        <Text fontSize="2xl" fontWeight="bold" color="theme.blueAlt">
          {t('energySavingsApplication.show.inEligibleDetails')}
        </Text>
        <Box
          border="1px"
          borderColor="theme.darkBlue"
          borderRadius="sm"
          px={3}
          py={1}
          fontSize="sm"
          color="theme.blueText"
        >
          {t('energySavingsApplication.show.applicationId')}
          {id}
        </Box>
        <Box w="100%" mt={4} textAlign={'left'}>
          <Text mb={1} fontSize="sm" color="gray.700">
            {t('energySavingsApplication.show.inEligibleReason')}
          </Text>
          <Textarea placeholder="Placeholder" mt={2} rows={4} w="full" />
        </Box>
        <Flex w="100%" justify="center" gap={4} mt={8}>
          <Button variant="primary" px={8}>
            {' '}
            {t('ui.confirm')}
          </Button>
          <Button variant="outline" px={8}>
            {' '}
            {t('ui.cancel')}
          </Button>
        </Flex>
      </VStack>
    </VStack>
  );
};

export default RejectApplicationScreen;
