import {
  Box,
  Button,
  Container,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  Heading,
  InputGroup,
  Switch,
  Text,
  VStack,
} from '@chakra-ui/react';
import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { IProgram } from '../../../models/program';
import { useMst } from '../../../setup/root';
import { AsyncRadioGroup } from '../../shared/base/inputs/async-radio-group';
import { TextFormControl } from '../../shared/form/input-form-control';
import { RouterLinkButton } from '../../shared/navigation/router-link-button';

export type TCreateProgramFormData = {
  programName: string;
  fundedBy: string;
};

export const NewProgramScreen = observer(() => {
  const { t } = useTranslation();
  const [program, setProgram] = useState<IProgram>();
  const [useCustom, setUseCustom] = useState<boolean>(false);

  const {
    programStore: { createProgram },
  } = useMst();

  const formMethods = useForm<TCreateProgramFormData>({
    mode: 'onChange',
    defaultValues: {
      programName: '',
      fundedBy: '',
    },
  });

  const navigate = useNavigate();
  const { handleSubmit, formState, control, watch } = formMethods;

  const { isSubmitting, isValid } = formState;

  const onSubmit = async (formData) => {
    const submissionData = { ...formData, programID: formData.programID?.id };
    const createdProgram = (await createProgram(submissionData)) as IProgram;
    if (createdProgram) {
      setProgram(createdProgram);
    }
  };

  const handleToggleCustom = () => setUseCustom((pastState) => !pastState);

  return (
    <Container maxW="container.lg" p={8} as="main">
      <FormProvider {...formMethods}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <VStack alignItems={'flex-start'} spacing={5} w={'full'} h={'full'}>
            <Heading as="h1" alignSelf="center" color="theme.blueAlt">
              {t('program.new.title')}
            </Heading>
            {program ? (
              <Flex direction="column" w="full" align="center" gap={6}>
                <Box background="greys.grey03" p={6} w="full">
                  <VStack>
                    <Text>{program.qualifier}</Text>
                    <Heading as="h3">{program.programName}</Heading>
                    <Text as={'span'} fontSize={'lg'}>
                      {t('program.new.fundedBy').toLowerCase() + ' ' + program.fundedBy}
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
                <Flex
                  direction="column"
                  as="section"
                  gap={6}
                  w="75%"
                  p={6}
                  border="solid 1px"
                  borderColor="border.light"
                  alignSelf="center"
                >
                  <Flex gap={8}>
                    <Box w="full">
                      <TextFormControl label={t('program.new.nameOfProgram')} fieldName={'programName'} required />
                      <TextFormControl mt={4} label={t('program.new.fundedBy')} fieldName={'fundedBy'} required />
                    </Box>
                  </Flex>
                </Flex>
                <Flex gap={4} alignSelf="center">
                  <Button
                    variant="primary"
                    type="submit"
                    isDisabled={!isValid || isSubmitting}
                    isLoading={isSubmitting}
                    loadingText={t('ui.loading')}
                  >
                    {t('program.new.createButton')}
                  </Button>
                  <Button variant="secondary" isDisabled={isSubmitting} onClick={() => navigate(-1)}>
                    {t('ui.cancel')}
                  </Button>
                </Flex>
              </>
            )}
          </VStack>
        </form>
      </FormProvider>
    </Container>
  );
});
