import { Button, Container, Flex, Heading, Text } from '@chakra-ui/react';
import { PaperPlaneTilt, Plus } from '@phosphor-icons/react';
import { observer } from 'mobx-react-lite';
import * as R from 'ramda';
import React, { useEffect } from 'react';
import { FormProvider, useFieldArray, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '../../../hooks/use-query';
import { useMst } from '../../../setup/root';
import { EmployeeUserInput } from '../../shared/base/inputs/employee-user-input';
import { EUserRoles } from '../../../types/enums';
import { CustomMessageBox } from '../../shared/base/custom-message-box';

interface IInviteEmployeeScreenProps {}

type TInviteFormData = {
  users: { name?: string; email?: string }[];
};

export const InviteEmployeeScreen = observer(({}: IInviteEmployeeScreenProps) => {
  const { t } = useTranslation();
  const { userStore, contractorStore } = useMst();
  const { contractorId } = useParams<{ contractorId: string }>();

  const { currentUser, resetInvitationResponse, fetchActivePrograms, setInvitationResponse, takenActiveEmails, takenPendingEmails, takenDeactivatedEmails } = userStore;

  const { environment } = useMst();
  const navigate = useNavigate();
  const query = useQuery();
  const prepopulatedEmail = query.get('email');
  const prepopulatedFirstName = query.get('firstName');

  const defaultUserValues = {
    email: prepopulatedEmail,
    name: prepopulatedFirstName,
  };

  const formMethods = useForm<TInviteFormData>({
    mode: 'onChange',
    defaultValues: {
      users: [defaultUserValues],
    },
  });

  const { handleSubmit, formState, control, reset } = formMethods;

  useEffect(() => {
    reset({
      users: [defaultUserValues],
    });
  }, []);

  useEffect(() => {
    resetInvitationResponse();
    // Fetch active programs for current user
    fetchActivePrograms();
    // Fetch contractor details
    if (contractorId) {
      contractorStore.fetchContractor(contractorId).then(() => {
        contractorStore.setCurrentContractor(contractorId);
      });
    }
  }, [contractorId]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'users',
  });

  const { isSubmitting, isValid } = formState;

  const onSubmit = async (formData: TInviteFormData) => {
    const activePrograms = currentUser?.activePrograms;
    // Check if we have contractor from route
    if (!contractorId) {
      console.error('No contractor ID in route');
      return;
    }

    if (!activePrograms || activePrograms.length === 0) {
      console.error('No active programs found for current user');
      return;
    }

    const firstProgram = activePrograms[0];
    const programId = firstProgram?.program?.id;

    if (!programId) {
      console.error('Could not extract program ID');
      return;
    }

    // Format users with name and role
    const usersWithRoles = formData.users.map((user) => ({
      email: user.email || '',
      name: user.name || '',
      role: EUserRoles.contractor,
    }));

    const response = await environment.api.inviteContractorEmployees(contractorId, programId, usersWithRoles);

    if (response.ok) {
      // Update the invitation response in the store so EmployeeUserInput can show status
      const responseData = response.data as any;
      setInvitationResponse(responseData);

      // Show success message for newly invited and reinvited users
      const invited = responseData?.invited || [];
      const reinvited = responseData?.reinvited || [];
      const totalSuccess = invited.length + reinvited.length;

      if (totalSuccess > 0) {
        const { uiStore } = useMst();
        const { EFlashMessageStatus } = await import('../../../types/enums');
        uiStore.flashMessage.show(
          EFlashMessageStatus.success,
          t('user.inviteSentSuccess', { count: totalSuccess }),
          '',
        );
      }
    } else {
      console.error('Failed to send invitations');
    }
  };

  // if (error) return <ErrorScreen error={error} />

  return (
    <Container maxW="container.lg" p={8} as="main">
      <Flex direction="column" gap={8}>
        <Flex direction="column">
          <Heading as="h1" color="theme.blueAlt">
            {t('user.inviteEmployeesTitle')}
          </Heading>

          <Text>{t('user.inviteEmployeesDescription')}</Text>
          <Text fontWeight="bold" fontSize="2xl" mt={4}>
            {contractorStore.currentContractor?.businessName}
          </Text>
        </Flex>
        <FormProvider {...formMethods}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Flex direction="column" gap={6}>
              <Flex direction="column" gap={4}>
                {fields.map((field, index) => (
                  <EmployeeUserInput key={field.id} index={index} remove={remove} />
                ))}
                <Button
                  type="button"
                  variant="tertiary"
                  onClick={() => append(defaultUserValues)}
                  leftIcon={<Plus size={16} />}
                >
                  {t('user.addMoreEmails')}
                </Button>
              </Flex>
              {(!R.isEmpty(takenActiveEmails) || !R.isEmpty(takenPendingEmails) || !R.isEmpty(takenDeactivatedEmails)) && (
                <CustomMessageBox
                  status="error"
                  title={t('user.takenErrorTitle')}
                  description={t('user.takenErrorDescription')}
                />
              )}
              <Flex gap={4}>
                <Button
                  variant="primary"
                  type="submit"
                  isLoading={isSubmitting}
                  isDisabled={!isValid || isSubmitting}
                  loadingText={t('ui.loading')}
                  rightIcon={<PaperPlaneTilt size={16} />}
                >
                  {t('user.sendInvites')}
                </Button>
                <Button variant="secondary" isDisabled={isSubmitting} onClick={() => navigate(`/contractor-management/${contractorId}/employees?currentPage=1`)}>
                  {t('ui.cancel')}
                </Button>
              </Flex>
            </Flex>
          </form>
        </FormProvider>
      </Flex>
    </Container>
  );
});
