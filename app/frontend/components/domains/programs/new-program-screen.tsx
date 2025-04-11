import { Box, Button, Container, Flex, HStack, Heading, Text, VStack } from '@chakra-ui/react';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { IProgram } from '../../../models/program';
import { useMst } from '../../../setup/root';
import { AsyncRadioGroup } from '../../shared/base/inputs/async-radio-group';
import { TextFormControl } from '../../shared/form/input-form-control';
import { RouterLinkButton } from '../../shared/navigation/router-link-button';
import { EProgramUserGroupType } from '../../../types/enums';

export type TCreateProgramFormData = {
  programName: string;
  fundedBy: string;
  // userGroupType: EProgramUserGroupType;
};

export const NewProgramScreen = observer(() => {
  const { t } = useTranslation();
  const location = useLocation();
  //const queryParams = new URLSearchParams(location.search);
  //const id = queryParams.get('id');
  const { programId } = useParams();
  const [program, setProgram] = useState<IProgram>();
  const [useCustom, setUseCustom] = useState<boolean>(false);

  const {
    programStore: { createProgram, fetchProgram, updateProgram },
  } = useMst();

  interface IOption<T> {
    value: T;
    label: string;
  }
  const formMethods = useForm<TCreateProgramFormData>({
    mode: 'onChange',
    defaultValues: {
      programName: '',
      fundedBy: '',
      // userGroupType: EProgramUserGroupType.participants,
    },
  });

  const navigate = useNavigate();
  const { handleSubmit, formState, control, watch, setValue } = formMethods;
  // const userGroupTypeWatch = watch('userGroupType');
  const { isSubmitting, isValid } = formState;

  useEffect(() => {
    if (programId) {
      (async () => {
        try {
          const fetchedProgram = await fetchProgram(programId);
          if (fetchedProgram) {
            setValue('programName', fetchedProgram.programName);
            setValue('fundedBy', fetchedProgram.fundedBy);
            // setValue('userGroupType', fetchedProgram.userGroupType);
          }
        } catch (e) {
          console.error(e.message);
        }
      })();
    }
  }, [programId, fetchProgram, setValue]);

  const onSubmit = async (formData) => {
    try {
      if (programId) {
        await updateProgram(programId, formData);
      } else {
        const createdProgram = await createProgram(formData);
        if (createdProgram) {
          setProgram(createdProgram);
        }
      }
    } catch (error) {
      console.error('Error saving program:', error.message);
    }
  };

  const fetchUserGroupTypeOptions = async (): Promise<IOption<string>[]> => {
    return Object.keys(EProgramUserGroupType).map((key) => {
      const value = EProgramUserGroupType[key as keyof typeof EProgramUserGroupType];
      return { value: key, label: value.charAt(0).toUpperCase() + value.slice(1) };
    });
  };

  const handleToggleCustom = () => setUseCustom((pastState) => !pastState);

  return (
    <Container maxW="container.lg" pt={8} as="main">
      <FormProvider {...formMethods}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <VStack alignItems={'flex-start'} pr={6} pl={6}>
            {program ? (
              <Flex direction="column" w="full" align="center" gap={6}>
                <Heading as="h1" color="theme.blueAlt">
                  {t('program.new.title')}
                </Heading>
                <Box
                  background="greys.grey10"
                  border="1px solid"
                  borderColor="greys.lightGrey"
                  borderRadius="sm"
                  p={6}
                  w="full"
                >
                  <VStack>
                    <Text>{program.qualifier}</Text>
                    <Heading as="h3">{program.programName}</Heading>
                    <Text as={'span'} fontSize={'lg'}>
                      {t('program.new.fundedBy') + ' ' + program.fundedBy}
                    </Text>
                  </VStack>
                </Box>
                <Text fontWeight="bold" fontSize="lg">
                  {t('program.new.nextStep')}
                </Text>
                <HStack>
                  <RouterLinkButton to={`/programs/${program?.slug}/users/invite`} variant="primary">
                    {t('user.index.inviteButton')}
                  </RouterLinkButton>
                  <RouterLinkButton to={`/programs`} variant="secondary">
                    {t('ui.doLater')}
                  </RouterLinkButton>
                </HStack>
              </Flex>
            ) : (
              <>
                <Flex direction="column" as="section" gap={6} w="full" alignSelf="center">
                  <Heading as="h1" color="theme.blueAlt">
                    {programId ? t('program.edit.editProgram') : t('program.new.title')}
                  </Heading>

                  <Box w="full">
                    <Flex direction="column" gap={8}>
                      {/* <AsyncRadioGroup
                        fetchOptions={fetchUserGroupTypeOptions}
                        fieldName="userGroupType"
                        question={t('program.new.targetGroup')}
                      /> */}
                      <Flex
                        bg="greys.grey10"
                        pt={6}
                        pr={6}
                        pb={10}
                        pl={4}
                        border="1px solid"
                        borderColor="greys.lightGrey"
                        borderRadius="sm"
                      >
                        <TextFormControl
                          label={t('program.new.nameOfProgram')}
                          fieldName={'programName'}
                          required
                          w={{ base: '100%', md: '30%' }}
                        />
                      </Flex>
                      <Flex
                        bg="greys.grey10"
                        pt={6}
                        pr={6}
                        pb={10}
                        pl={4}
                        border="1px solid"
                        borderColor="greys.lightGrey"
                        borderRadius="sm"
                      >
                        <TextFormControl
                          label={t('program.new.fundedBy')}
                          fieldName={'fundedBy'}
                          required
                          w={{ base: '100%', md: '30%' }}
                        />
                      </Flex>
                    </Flex>
                  </Box>

                  <Flex gap={4}>
                    <Button
                      width={'140px'}
                      variant="primary"
                      type="submit"
                      isDisabled={!isValid || isSubmitting}
                      isLoading={isSubmitting}
                      loadingText={t('ui.loading')}
                    >
                      {programId ? t('ui.onlySave') : t('program.new.createButton')}
                    </Button>
                    <Button variant="secondary" width={'140px'} isDisabled={isSubmitting} onClick={() => navigate(-1)}>
                      {t('ui.cancel')}
                    </Button>
                  </Flex>
                </Flex>
              </>
            )}
          </VStack>
        </form>
      </FormProvider>
    </Container>
  );
});
