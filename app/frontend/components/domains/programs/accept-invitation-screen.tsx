import { Button, Container, Divider, Flex, Heading, Text, VStack } from '@chakra-ui/react';
import { t } from 'i18next';
import { observer } from 'mobx-react-lite';
import React, { Suspense, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Trans } from 'react-i18next';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { IUser } from '../../../models/user';
import { useMst } from '../../../setup/root';
import { EUserRoles } from '../../../types/enums';
import { LoadingScreen } from '../../shared/base/loading-screen';
import { BusinessBCeIDInfo } from '../../shared/bceid/business';
import { CenterContainer } from '../../shared/containers/center-container';
import { AdminPortalLogin, LoginForm } from '../admin/login';
import { RouterLink } from '../../shared/navigation/router-link';
import { storeEntryPoint } from '../../shared/store-entry-point';
import { RouterLinkButton } from '../../shared/navigation/router-link-button';

export const AcceptInvitationScreen = observer(() => {
  const { userStore } = useMst();
  const { invitedUser, fetchInvitedUser } = userStore;
  const [invalidToken, setInvalidToken] = useState(false);

  const { programId } = useParams();
  const [searchParams] = useSearchParams();

  const invitationToken = searchParams.get('invitation_token');

  useEffect(() => {
    const fetch = async () => {
      const result = await fetchInvitedUser(invitationToken, programId);

      if (!result) setInvalidToken(true);
    };
    fetch();
  }, []);

  return (
    <Suspense fallback={<LoadingScreen />}>
      {invitedUser ? <Content invitedUser={invitedUser} /> : invalidToken && <InvalidTokenMessage />}
    </Suspense>
  );
});

interface IProps {
  invitedUser: IUser;
}
const Content = observer(function Content({ invitedUser }: Readonly<IProps>) {
  const { sessionStore } = useMst();
  const { loggedIn } = sessionStore;

  const { invitedByEmail, invitedToProgram, email, role } = invitedUser;

  const loginScreenProps = {
    isAdmin: role === 'admin',
    isAdminMgr: role === 'admin_manager',
    isSysAdmin: role === 'system_admin',
  };

  // const loginKey = Object.keys(loginScreenProps).find((key) => loginScreenProps[key as keyof typeof loginScreenProps]);

  // const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
  //   event.preventDefault(); // Prevent the default form submission

  //   // Store the entry point in the session
  //   await storeEntryPoint(loginKey);

  //   // Submit the form after storing the entry point
  //   (event.target as HTMLFormElement).submit();
  // };

  return (
    <AdminPortalLogin
      isAdmin={loginScreenProps.isAdmin}
      isAdminMgr={loginScreenProps.isAdminMgr}
      isSysAdmin={loginScreenProps.isSysAdmin}
    />
    // <CenterContainer>
    //   <Flex
    //     direction="column"
    //     gap={6}
    //     maxW="500px"
    //     p={10}
    //     border="solid 1px"
    //     borderColor="border.light"
    //     bg="greys.white"
    //   >
    //     <Heading as="h1">{t('user.acceptInvitation')}</Heading>
    //     <>
    //       <Text>
    //         <Trans i18nKey="user.invitedBy" values={{ email: invitedByEmail }} />
    //       </Text>

    //       <VStack spacing={4} w="full" p={4} bg="theme.blueLight" rounded="sm" textAlign="center">
    //         <Heading as="h2" m={0}>
    //           {invitedToProgram.programName}
    //         </Heading>
    //         <Text>{t('user.invitedAs')}</Text>
    //         <Text fontWeight="bold">{t(`user.roles.${role as EUserRoles}`)}</Text>
    //       </VStack>
    //     </>

    //     <Text fontStyle="italic" fontSize="sm" textAlign="center">
    //       <Trans i18nKey="user.invitationIntent" values={{ email }} />
    //     </Text>

    //     <Divider my={4} />

    //     {loggedIn ? (
    //       <AcceptInviteForm />
    //     ) : (
    //       <>
    //         <Heading as="h3" textAlign="center">
    //           {t('user.createAccount')}
    //         </Heading>
    //         <LoginForm handleSubmit={handleSubmit} />
    //       </>
    //     )}
    //   </Flex>
    // </CenterContainer>
  );
});

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

const AcceptInviteForm = observer(function AcceptInviteForm() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { userStore, uiStore } = useMst();
  const { updateRmJurisdictionSelectKey } = uiStore;
  const { currentUser } = userStore;
  const { handleSubmit, formState } = useForm();
  const { isSubmitting } = formState;

  const onSubmit = async () => {
    updateRmJurisdictionSelectKey();
    await currentUser.acceptInvitation(searchParams.get('invitation_token'));
    navigate('/');
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Button variant="primary" w="full" type="submit" isDisabled={isSubmitting}>
        {t('user.acceptInvitation')}
      </Button>
    </form>
  );
});
