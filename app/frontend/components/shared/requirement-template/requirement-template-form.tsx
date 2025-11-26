import { Button, Flex, Text, VStack } from '@chakra-ui/react';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { IRequirementTemplate } from '../../../models/requirement-template';
import { useMst } from '../../../setup/root';
import { ERequirementTemplateType } from '../../../types/enums';
import { IOption, TCreateRequirementTemplateFormData } from '../../../types/types';
import { AsyncRadioGroup } from '../base/inputs/async-radio-group';
import { TextFormControl } from '../form/input-form-control';
import { useSearch } from '../../../hooks/use-search';
import { AsyncDropdown } from '../base/inputs/async-dropdown';
import { FieldBlock } from '../base/field-block';
interface IRequirementTemplateFormProps {
  type: ERequirementTemplateType;
  onSuccess: (createdRequirementTemplate: IRequirementTemplate) => void;
}

export const RequirementTemplateForm = observer(({ type, onSuccess }: IRequirementTemplateFormProps) => {
  const { t } = useTranslation();
  const {
    requirementTemplateStore: { createRequirementTemplate, copyRequirementTemplate },
    permitClassificationStore,
  } = useMst();
  const { programStore } = useMst();
  const { tablePrograms } = programStore;

  useSearch(programStore);
  const [copyExisting, setCopyExisting] = useState(false);

  const fetchPrograms = async (): Promise<IOption<string>[]> => {
    return tablePrograms.map((program) => {
      return {
        value: program.id,
        label: program.programName || 'No Program Name',
      };
    });
  };

  const formMethods = useForm<TCreateRequirementTemplateFormData>({
    mode: 'all',
    defaultValues: {
      description: '',
      firstNations: false,
      permitTypeId: null,
      activityId: null,
      audienceTypeId: null,
      userGroupTypeId: null,
      submissionTypeId: null,
      programId: null,
      nickname: '',
    },
  });

  const navigate = useNavigate();
  const { handleSubmit, formState, control } = formMethods;

  const { isSubmitting, isValid } = formState;

  const selectedSubmissionTypeId = useWatch({
    control,
    name: 'submissionTypeId',
  });
  const variants = selectedSubmissionTypeId
    ? permitClassificationStore.getSubmissionVariantsForType(selectedSubmissionTypeId)
    : [];

  const onSubmit = async (formData: TCreateRequirementTemplateFormData) => {
    formData.type = type;

    const createdRequirementTemplate = copyExisting
      ? await copyRequirementTemplate(formData)
      : await createRequirementTemplate(formData);

    if (createdRequirementTemplate) {
      onSuccess(createdRequirementTemplate);
    }
  };

  useEffect(() => {
    if (!permitClassificationStore.isLoaded) {
      permitClassificationStore.fetchPermitClassifications();
    }
  }, [permitClassificationStore.isLoaded]);

  return (
    <FormProvider {...formMethods}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <VStack alignItems={'flex-start'} spacing={5} gap={8} w={'full'} h={'full'}>
          <VStack display={'contents'}>
            {tablePrograms.length > 0 && (
              <AsyncDropdown
                fetchOptions={fetchPrograms}
                fieldName={'programId'}
                question={t('requirementTemplate.new.programQuestion')}
                placeholderOptionLabel={t('ui.selectProgram')}
                useBoxWrapper={true}
              />
            )}
            <AsyncRadioGroup
              valueField="id"
              question={t('requirementTemplate.fields.userGroupTypeSelect')}
              fetchOptions={async () => permitClassificationStore.userGroupTypeOptions}
              fieldName={'userGroupTypeId'}
            />
            <AsyncRadioGroup
              valueField="id"
              question={t('requirementTemplate.fields.audienceTypeSelect')}
              fetchOptions={async () => permitClassificationStore.audienceTypeOptions}
              fieldName={'audienceTypeId'}
            />
            <FieldBlock>
              <AsyncDropdown
                fetchOptions={async () => permitClassificationStore.submissionTypeOptions}
                fieldName="submissionTypeId"
                question={t('requirementTemplate.fields.submissionTypeSelect')}
                useBoxWrapper={false}
              />
              {variants.length > 0 && (
                <AsyncDropdown
                  fetchOptions={async () =>
                    variants.map((v) => ({
                      label: v.name,
                      value: v.id,
                    }))
                  }
                  fieldName="submissionVariantId"
                  question={t('requirementTemplate.fields.submissionSubTypeSelect')}
                  useBoxWrapper={false}
                />
              )}
            </FieldBlock>
            <Flex
              bg="greys.grey10"
              p={4}
              border="1px solid"
              borderColor="greys.grey02"
              borderRadius="sm"
              width="100%"
              direction="column"
            >
              <Text>{t('requirementTemplate.new.applicationName')}</Text>
              <Controller
                name="nickname"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <TextFormControl mt={2} fieldName="nickname" required value={field.value} onChange={field.onChange} />
                )}
              />
            </Flex>
          </VStack>
          <Flex
            bg="greys.grey10"
            p={4}
            border="1px solid"
            borderColor="greys.grey02"
            borderRadius="sm"
            width="100%"
            direction="column"
          >
            <Controller
              name="description"
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <TextFormControl
                  label={t('requirementTemplate.fields.description')}
                  fieldName="description"
                  required
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <Text fontSize="sm" color="border.base" mt={4}>
              {t('requirementTemplate.new.descriptionHelpText')}
            </Text>
          </Flex>

          {/* Buttons */}
          <Flex gap={4}>
            <Button
              variant="primary"
              type="submit"
              isDisabled={!isValid || isSubmitting}
              isLoading={isSubmitting}
              loadingText={t('ui.loading')}
            >
              {t('requirementTemplate.new.createButton')}
            </Button>
            <Button variant="secondary" isDisabled={isSubmitting} onClick={() => navigate(-1)}>
              {t('ui.cancel')}
            </Button>
          </Flex>
        </VStack>
      </form>
    </FormProvider>
  );
});
