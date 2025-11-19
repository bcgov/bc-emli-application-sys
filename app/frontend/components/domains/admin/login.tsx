import { Box, Divider, Flex, Heading, HStack, Link, Text, VStack, Button } from '@chakra-ui/react';
import { ArrowSquareOut } from '@phosphor-icons/react';
import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { CenterContainer } from '../../shared/containers/center-container';
import { storeEntryPoint } from '../../shared/store-entry-point';
import { useMst } from '../../../setup/root';

export interface ILoginScreenProps {
  isAdmin?: boolean;
  isPSR?: boolean;
  isAdminMgr?: boolean;
  isSysAdmin?: boolean;
  isContractor?: boolean;
}

export const AdminPortalLogin = ({ isAdmin, isPSR, isAdminMgr, isSysAdmin, isContractor }: ILoginScreenProps) => {
  const { t } = useTranslation();

  const rootStore = useMst();
  const { sessionStore } = rootStore;

  const loginScreenProps = { isAdmin, isPSR, isAdminMgr, isSysAdmin, isContractor };
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
    } else if (isContractor) {
      return t('auth.contractorLogin');
    } else {
      return t('auth.adminLogin'); // Fallback in case none of the booleans are true
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // Prevent the default form submission

    // Store the entry point in the session
    await storeEntryPoint(loginKey);
    sessionStore.setEntryPoint(loginKey);

    // Submit the form after storing the entry point
    (event.target as HTMLFormElement).submit();
  };

  // Usage
  const loginMessage = loginType();

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
            <Text fontSize="md">
              {isContractor ? t('auth.bceidInfo.contractor.loginPrompt') : t('auth.adminPortalLoginInfo.login')}
            </Text>
          </VStack>
          <LoginForm handleSubmit={handleSubmit} isContractor={isContractor} />
          <Divider my={4} />
        </Flex>
      </Flex>
    </CenterContainer>
  );
};

export const LoginForm = ({ handleSubmit, isContractor }) => {
  const { t } = useTranslation();
  const authFormRef = useRef<HTMLFormElement>(null);

  return (
    <>
      <form action="/api/auth/keycloak" method="post" onSubmit={handleSubmit}>
        <input type="hidden" name="kc_idp_hint" value={isContractor ? 'bceidbusiness' : 'azureidir'} />
        <input
          type="hidden"
          name="authenticity_token"
          value={(document.querySelector('[name=csrf-token]') as HTMLMetaElement).content}
        />
        <Button variant="primary" w="full" type="submit" rightIcon={<ArrowSquareOut size={16} />}>
          {isContractor ? t('auth.bceidInfo.contractor.loginButton') : t('auth.adminPortalLoginInfo.button')}
        </Button>
      </form>
      {!isContractor && (
        <>
          <Box>
            <HStack>
              <Text whiteSpace="pre-line">
                {t('auth.adminPortalLoginInfo.trouble.beforeLink')}
                <Link href={t('auth.adminPortalLoginInfo.trouble.link')} color="text.primary" isExternal>
                  {t('auth.adminPortalLoginInfo.trouble.linkText')}
                </Link>
                {t('auth.adminPortalLoginInfo.trouble.afterLink')}
              </Text>
            </HStack>
          </Box>

          <Box>
            <Text fontWeight="bold">{t('auth.adminPortalLoginInfo.noAccount.text')}</Text>
            <form ref={authFormRef} id="authForm" action="/api/auth/keycloak" method="post" onSubmit={handleSubmit}>
              <input type="hidden" name="kc_idp_hint" value="bceidbusiness" />
              <input
                type="hidden"
                name="authenticity_token"
                value={(document.querySelector('[name=csrf-token]') as HTMLMetaElement).content}
              />
              <Link
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  authFormRef.current?.requestSubmit();
                }}
              >
                {t('auth.adminPortalLoginInfo.noAccount.altLoginText')}
              </Link>
            </form>
          </Box>
        </>
      )}
      {isContractor && (
        <Box>
          <Text fontSize="md">
            {t('auth.bceidInfo.contractor.needSetup')}{' '}
            <Link
              href={import.meta.env.VITE_BUSINESS_BCEID_REGISTRATION_URL}
              color="text.primary"
              isExternal
              textDecoration="underline"
            >
              {t('auth.bceidInfo.contractor.here')}
            </Link>
            .
          </Text>
        </Box>
      )}
    </>
  );
};
