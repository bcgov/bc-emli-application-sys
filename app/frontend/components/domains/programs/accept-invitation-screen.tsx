import { Container, Heading, ListItem, Text, UnorderedList, VStack, Link } from '@chakra-ui/react';
import { t } from 'i18next';
import { observer } from 'mobx-react-lite';
import React, { Suspense, useEffect, useState } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { IUser } from '../../../models/user';
import { useMst } from '../../../setup/root';
import { LoadingScreen } from '../../shared/base/loading-screen';
import { AdminPortalLogin } from '../admin/login';
import { RouterLinkButton } from '../../shared/navigation/router-link-button';

export const AcceptInvitationScreen = observer(() => {
  const { userStore } = useMst();
  const { invitedUser, fetchInvitedUser } = userStore;
  const [invitationUserResponse, setInvitationUserResponse] = useState({
    isInvalidToken: false,
    status: null,
    role: null,
  });

  const { programId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const invitationToken = searchParams.get('invitation_token');

  useEffect(() => {
    const fetch = async () => {
      const result = await fetchInvitedUser(invitationToken, programId);

      if (!result?.isOk) {
        if (result.status === 'invalid') {
          navigate('/not-found');
          return;
        }

        // Consumed users with a known admin role already have an account — redirect silently to login
        const knownAdminRoles = ['admin', 'admin_manager', 'system_admin'];
        if (result.status === 'accepted' && knownAdminRoles.includes(result.role)) {
          navigate('/login');
          return;
        }

        setInvitationUserResponse({
          isInvalidToken: true,
          status: result.status,
          role: result.role,
        });
      }
    };
    fetch();
  }, []);

  return (
    <Suspense fallback={<LoadingScreen />}>
      {invitedUser ? (
        <Content invitedUser={invitedUser} />
      ) : (
        invitationUserResponse.isInvalidToken && (
          <InvalidTokenMessage invitationStatus={invitationUserResponse.status} role={invitationUserResponse.role} />
        )
      )}
    </Suspense>
  );
});

interface IProps {
  invitedUser: IUser;
}
const Content = observer(function Content({ invitedUser }: Readonly<IProps>) {
  const { role } = invitedUser;
  return (
    <AdminPortalLogin
      isAdmin={role === 'admin'}
      isAdminMgr={role === 'admin_manager'}
      isSysAdmin={role === 'system_admin'}
      isContractor={role === 'contractor'}
    />
  );
});

function InvalidTokenMessage({ invitationStatus, role }: { invitationStatus: string | null; role: string | null }) {
  const isContractor = role === 'contractor';
  const isConsumed = invitationStatus === 'accepted' && isContractor;
  const isExpired = invitationStatus === 'not_acceptable' && isContractor;

  if (!isContractor) {
    return (
      <Container maxW="900px">
        <VStack gap={8} my="20" mb={10}>
          <Heading as="h1" color="theme.blueAlt">
            {t('user.invalidInvitationToken.expired.title')}
          </Heading>
          <Text>{t('user.invalidInvitationToken.expired.adminBody')}</Text>
        </VStack>
      </Container>
    );
  }

  if (isExpired) {
    return (
      <Container maxW="container.lg">
        <VStack gap={6} my="20" mb="40">
          <Heading as="h1">{t('user.invalidInvitationToken.expired.title')}</Heading>
          <Text>{t('user.invalidInvitationToken.message')}</Text>
          <Link href={'mailto:' + t('user.invalidInvitationToken.mailTo')}>
            {t('user.invalidInvitationToken.mailTo')}
          </Link>
          <RouterLinkButton to="/welcome/contractor">{t('user.invalidInvitationToken.expired.cta')}</RouterLinkButton>
        </VStack>
      </Container>
    );
  }

  if (isConsumed) {
    return (
      <Container maxW="900px">
        <VStack gap={8} my="20" mb={10} align="start" fontSize="lg">
          <Heading as="h1" color="theme.blueAlt">
            {t('user.invalidInvitationToken.consumed.title')}
          </Heading>
          <Text>{t('user.invalidInvitationToken.consumed.body1')}</Text>
          <Text>{t('user.invalidInvitationToken.consumed.body2')}</Text>
          <Text>{t('user.invalidInvitationToken.contact.heading')}</Text>
          <UnorderedList>
            <ListItem>Phone: {t('user.invalidInvitationToken.contact.phone')}</ListItem>
            <ListItem>
              Email:{' '}
              <Link href={`mailto:${t('user.invalidInvitationToken.contact.email')}`}>
                {t('user.invalidInvitationToken.contact.email')}
              </Link>
            </ListItem>
          </UnorderedList>
        </VStack>
      </Container>
    );
  }

  // Safety net — invalid tokens are redirected to /not-found before reaching here
  return null;
}
