import { Container, Heading, Text, VStack } from '@chakra-ui/react';
import { t } from 'i18next';
import { observer } from 'mobx-react-lite';
import React, { Suspense, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMst } from '../../../setup/root';
import { LoadingScreen } from '../../shared/base/loading-screen';
import { RouterLink } from '../../shared/navigation/router-link';
import { RouterLinkButton } from '../../shared/navigation/router-link-button';
import { useSessionStorage } from '../../../hooks/use-session-state';

export const ContractorOnboardingImport = observer(() => {
  const { contractorStore } = useMst();
  const [contractorImportToken, setContractorImportToken] = useSessionStorage('contractorImportToken', null);
  const [invalidToken, setInvalidToken] = useState(false);

  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  useEffect(() => {
    const fetch = async () => {
      const response = await contractorStore.validateImportToken(token);
      console.log('Validation response:', response);

      if (response?.data?.valid) {
        // Token is valid, proceed with onboarding
        setContractorImportToken(token);
      } else {
        // Token is invalid, show error message
        setInvalidToken(true);
      }
    };
    fetch();
  }, []);

  return (
    <Suspense fallback={<LoadingScreen />}>
      {contractorImportToken ? <Content /> : invalidToken && <InvalidTokenMessage />}
    </Suspense>
  );
});

const Content = observer(function Content(): JSX.Element | null {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/contractor');
  }, []);

  return null;
});

//TODO:
function InvalidTokenMessage() {
  return (
    <Container maxW="container.lg">
      <VStack gap={12} my="20" mb="40">
        <VStack>
          <Heading as="h1" mb={0}>
            {t('user.invalidInvitationToken.title')}
          </Heading>
          <Text>{t('user.invalidInvitationToken.message')}</Text>
        </VStack>
        <RouterLinkButton to="/">{t('site.pageNotFoundCTA')}</RouterLinkButton>
        <Text>
          {t('site.pageNotFoundContactInstructions')} <RouterLink to="/contact">{t('site.contact')}</RouterLink>
        </Text>
      </VStack>
    </Container>
  );
}
