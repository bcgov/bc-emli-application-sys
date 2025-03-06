import { Box, Button, Divider, Container, Flex, HStack, Heading, Link, Text, VStack } from '@chakra-ui/react';
import { ArrowSquareOut, Phone } from '@phosphor-icons/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { EnergyCoachInfoBlock } from '../../shared/bcservicecard/energy-coach';
import { CenterContainer } from '../../shared/containers/center-container';
import { storeEntryPoint } from '../../shared/store-entry-point';

export const LoginScreen = () => {
  const { t } = useTranslation();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // Prevent the default form submission

    // Store the entry point in the session
    await storeEntryPoint('isParticipant');

    // Submit the form after storing the entry point
    (event.target as HTMLFormElement).submit();
  };

  return (
    <>
      <CenterContainer h="full">
        <Flex direction={{ base: 'column', md: 'row' }} gap={10}>
          <Flex
            direction="column"
            gap={6}
            flex={1}
            p={'10'}
            border="solid 1px"
            borderColor="border.light"
            bg="greys.white"
            boxSizing="border-box"
            w={{ md: '500px' }}
          >
            <VStack spacing={2} align="start">
              <Heading as="h1" mb={0} color="theme.blueAlt">
                {t('auth.participantLogin')}
              </Heading>
              <Text fontSize="md">{t('auth.bcServiceCardInfo.prompt')}</Text>
            </VStack>
            <form action="/api/auth/keycloak" method="post" onSubmit={handleSubmit}>
              <input type="hidden" name="kc_idp_hint" value="bcsc" />
              <input
                type="hidden"
                name="authenticity_token"
                value={(document.querySelector('[name=csrf-token]') as HTMLMetaElement).content}
              />
              <Button variant="primary" w="full" type="submit" rightIcon={<ArrowSquareOut size={16} />}>
                {t('auth.bcsc_login')}
              </Button>
            </form>
            <Box>
              <Text fontWeight="bold">{t('auth.noAccount')}</Text>
              <HStack>
                <Text>
                  <Link href={t('auth.bcServiceCardInfo.learnMoreLink')} color="text.primary" isExternal>
                    {t('auth.bcServiceCardInfo.learnMore')}{' '}
                  </Link>
                  {t('auth.bcServiceCardInfo.loginHelp')}
                </Text>
              </HStack>
            </Box>
            <Box>
              <Text fontWeight="bold">{t('auth.bcServiceCardInfo.noSmartPhone')}</Text>
              <Text>
                {t('auth.bcServiceCardInfo.phoneService')}{' '}
                <Link href={t('auth.bcServiceCardInfo.learnMoreTokensLink')} color="text.primary" isExternal>
                  {t('auth.bcServiceCardInfo.serviceCardTokens')}
                </Link>
              </Text>
            </Box>
            <Text>{t('auth.troubleLogging')}</Text>

            <Flex direction="row" align="center" gap={2}>
              <Phone size={16} />
              <Text flex={1}>{t('auth.phoneNumber')}</Text>
            </Flex>
            <Text>{t('auth.phoneNumberHours')}</Text>
            <Box>
              <Text fontWeight="bold">{t('auth.bcServiceCardInfo.noBCServicesCard')}</Text>
              <form id="authForm" action="/api/auth/keycloak" method="post" onSubmit={handleSubmit}>
                <input type="hidden" name="kc_idp_hint" value="bceidbasic" />
                <input
                  type="hidden"
                  name="authenticity_token"
                  value={(document.querySelector('[name=csrf-token]') as HTMLMetaElement).content}
                />
              </form>

              <Link href="#" onClick={() => (document.getElementById('authForm') as HTMLFormElement).submit()}>
                {t('auth.bcServiceCardInfo.bceidLogin')}
              </Link>
            </Box>
            <Divider my={4} />
            <Heading as="h2" m={0} color="theme.blueAlt">
              {t('auth.bceidInfo.needHelp')}
            </Heading>
            <EnergyCoachInfoBlock />
          </Flex>
        </Flex>
      </CenterContainer>
      <Box w="full" bg="greys.grey03" paddingBottom={10}>
        <Container maxW="container.lg" bg="greys.grey03" centerContent>
          <Text fontSize="12px" textAlign="center">
            {t('auth.footer')}
            <Link href={'mailto:' + t('auth.betterHomesEmail')} isExternal>
              {t('auth.betterHomesEmail')}
            </Link>
            {t('auth.period')}
          </Text>
        </Container>
      </Box>
    </>
  );
};
