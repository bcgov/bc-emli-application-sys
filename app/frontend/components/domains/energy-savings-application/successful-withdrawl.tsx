import { Container, Flex, Heading, Icon, Text, VStack } from '@chakra-ui/react';
import { CheckCircle, WarningCircle } from '@phosphor-icons/react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { RouterLinkButton } from '../../shared/navigation/router-link-button';
import { useMst } from '../../../setup/root';

export const SuccessfulWithdrawalScreen = observer(() => {
  const { t } = useTranslation();
  const { userStore } = useMst();
  const currentUser = userStore.currentUser;

  return (
    <Container maxW="container.lg">
      <Flex direction="column" align="center" my={24} gap={8}>
        <Icon as={WarningCircle} boxSize={12} color="orange.400" />

        <VStack spacing={4}>
          <Heading as="h2" fontSize="32px" fontWeight="700" color="theme.blueAlt" textAlign="center">
            {t('permitApplication.withdraw.success.title')}
          </Heading>
          <Text fontSize="16px" fontWeight="400" color="greys.anotherGrey" textAlign="center">
            {t('permitApplication.withdraw.success.subtitleEmail')}
          </Text>
        </VStack>

        <RouterLinkButton
          to="/applications"
          bg="theme.darkBlue"
          color="white"
          px={8}
          _hover={{ bg: 'theme.blueButtonHover' }}
        >
          {currentUser.isParticipant
            ? t('energySavingsApplication.returnToMain')
            : t('energySavingsApplication.returnHome')}
        </RouterLinkButton>
      </Flex>
    </Container>
  );
});
