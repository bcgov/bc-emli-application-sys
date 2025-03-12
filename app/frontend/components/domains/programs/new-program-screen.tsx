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
import { IJurisdiction } from '../../../models/jurisdiction';
import { useMst } from '../../../setup/root';
import { EJurisdictionTypes } from '../../../types/enums';
import { AsyncRadioGroup } from '../../shared/base/inputs/async-radio-group';
import { TextFormControl } from '../../shared/form/input-form-control';
import { RouterLinkButton } from '../../shared/navigation/router-link-button';
import { JurisdictionSelect } from '../../shared/select/selectors/jurisdiction-select';

export type TCreateJurisdictionFormData = {
  name: string;
  localityType: string;
  postalAddress: string;
  regionalDistrict: IJurisdiction;
};

export type TCreateProgramFormData = {
  programName: string;
  fundedBy: string;
};

export const NewProgramScreen = observer(() => {
  const { t } = useTranslation();
  const [jurisdiction, setJurisdiction] = useState<IJurisdiction>();
  const [useCustom, setUseCustom] = useState<boolean>(false);
  const {
    jurisdictionStore: { createJurisdiction, fetchLocalityTypeOptions, regionalDistrictLocalityType },
  } = useMst();

  const formMethods = useForm<TCreateJurisdictionFormData>({
    mode: 'onChange',
    defaultValues: {
      name: '',
      localityType: '',
      postalAddress: '',
      regionalDistrict: null,
    },
  });

  const navigate = useNavigate();
  const { handleSubmit, formState, control, watch } = formMethods;

  const { isSubmitting, isValid } = formState;

  const onSubmit = async (formData) => {
    const submissionData = { ...formData, regionalDistrictId: formData.regionalDistrict?.id };
    const createdJurisdiction = (await createJurisdiction(submissionData)) as IJurisdiction;
    if (createdJurisdiction) {
      setJurisdiction(createdJurisdiction);
    }
  };

  const handleToggleCustom = () => setUseCustom((pastState) => !pastState);

  return (
    <Container maxW="container.lg" p={8} as="main">
      <FormProvider {...formMethods}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <VStack alignItems={'flex-start'} spacing={5} w={'full'} h={'full'}>
            <Heading as="h1" alignSelf="center">
              {t('program.new.title')}
            </Heading>
            {jurisdiction ? (
              <Flex direction="column" w="full" align="center" gap={6}>
                <Box background="greys.grey03" p={6} w="full">
                  <VStack>
                    <Text>{jurisdiction.qualifier}</Text>
                    <Heading as="h3">{jurisdiction.name}</Heading>
                  </VStack>
                </Box>
                <Text fontWeight="bold" fontSize="lg">
                  {t('jurisdiction.new.nextStep')}
                </Text>
                <HStack>
                  <RouterLinkButton to={`/jurisdictions/${jurisdiction?.slug}/users/invite`} variant="primary">
                    {t('user.index.inviteButton')}
                  </RouterLinkButton>
                  <RouterLinkButton to={`/jurisdictions`} variant="secondary">
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
                      <TextFormControl label={t('program.new.fundedBy')} fieldName={'fundedBy'} required />
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
