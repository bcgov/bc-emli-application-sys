import { Box, Divider, Flex, Heading, HStack, Link, Text, VStack, Button } from '@chakra-ui/react';
import { ArrowSquareOut } from '@phosphor-icons/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { CenterContainer } from '../../shared/containers/center-container';
import { storeEntryPoint } from '../../shared/store-entry-point';

export interface ILoginScreenProps {
  isAdmin?: boolean;
  isPSR?: boolean;
  isAdminMgr?: boolean;
  isSysAdmin?: boolean;
}

export const AdminPortalLogin = ({ isAdmin, isPSR, isAdminMgr, isSysAdmin }: ILoginScreenProps) => {
  const { t } = useTranslation();
  const loginScreenProps = { isAdmin, isPSR, isAdminMgr, isSysAdmin };
  const loginKey = Object.keys(loginScreenProps).filter(
    (key) => loginScreenProps[key as keyof ILoginScreenProps] !== undefined,
  )[0];

  const loginType = () => {
    if (isAdmin) {
      return t('auth.adminLogin');
    } else if (isPSR) {
      return t('auth.psrLogin');
    } else if (isAdminMgr) {
      return t('auth.adminMgrLogin');
    } else if (isSysAdmin) {
      return t('auth.sysAdminLogin');
    } else {
      return t('auth.adminLogin'); // Fallback in case none of the booleans are true
    }
  };

  // Usage
  const loginMessage = loginType();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // Prevent the default form submission

    // Store the entry point in the session
    await storeEntryPoint(loginKey);

    // Submit the form after storing the entry point
    (event.target as HTMLFormElement).submit();
  };

  return (
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
              {loginMessage}
            </Heading>
            <Text fontSize="md">{t('auth.adminPortalLoginInfo.login')}</Text>
          </VStack>
          <form action="/api/auth/keycloak" method="post" onSubmit={handleSubmit}>
            <input type="hidden" name="kc_idp_hint" value="azureidir" />
            <input
              type="hidden"
              name="authenticity_token"
              value={(document.querySelector('[name=csrf-token]') as HTMLMetaElement).content}
            />
            <Button variant="primary" w="full" type="submit" rightIcon={<ArrowSquareOut size={16} />}>
              {t('auth.adminPortalLoginInfo.button')}
            </Button>
          </form>
          <Box>
            <HStack>
              <Text>
                <Link href={t('auth.adminPortalLoginInfo.trouble.link')} color="text.primary" isExternal>
                  {t('auth.adminPortalLoginInfo.trouble.linkText')}{' '}
                </Link>
                {t('auth.adminPortalLoginInfo.trouble.text')}
              </Text>
            </HStack>
          </Box>

          <Box>
            <Text fontWeight="bold">{t('auth.adminPortalLoginInfo.noAccount.text')}</Text>
            <form id="authForm" action="/api/auth/keycloak" method="post">
              <input type="hidden" name="kc_idp_hint" value="bceidbusiness" />
              <input
                type="hidden"
                name="authenticity_token"
                value={(document.querySelector('[name=csrf-token]') as HTMLMetaElement).content}
              />
            </form>

            <Link href="#" onClick={() => (document.getElementById('authForm') as HTMLFormElement).submit()}>
              {t('auth.adminPortalLoginInfo.noAccount.altLoginText')}
            </Link>
          </Box>
          <Divider my={4} />
        </Flex>
      </Flex>
    </CenterContainer>
  );
};
