import { Button, Checkbox, Flex, Link, Text, VStack } from "@chakra-ui/react"
import { observer } from "mobx-react-lite"
import React, { useState } from "react"
import { Controller, FormProvider, useForm, useWatch } from "react-hook-form"
import { Trans, useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { IRequirementTemplate } from "../../../models/requirement-template"
import { useMst } from "../../../setup/root"
import { ERequirementTemplateType } from "../../../types/enums"
import { TCreateRequirementTemplateFormData } from "../../../types/types"
import { AsyncRadioGroup } from "../base/inputs/async-radio-group"
import { TextFormControl } from "../form/input-form-control"
import { HStack } from '../../domains/step-code/checklist/pdf-content/shared/h-stack';

interface IRequirementTemplateFormProps {
  type: ERequirementTemplateType;
  onSuccess: (createdRequirementTemplate: IRequirementTemplate) => void;
}

export const RequirementTemplateForm = observer(({ type, onSuccess }: IRequirementTemplateFormProps) => {
  const { t } = useTranslation();
  const {
    requirementTemplateStore: { createRequirementTemplate, copyRequirementTemplate },
    permitClassificationStore: { fetchPermitTypeOptions, fetchActivityOptions },
  } = useMst();

  const [copyExisting, setCopyExisting] = useState(false);

  const formMethods = useForm<TCreateRequirementTemplateFormData>({
    mode: 'onChange',
    defaultValues: {
      description: '',
      firstNations: false,
      permitTypeId: null,
      activityId: null,
    },
  });

  const navigate = useNavigate();
  const { handleSubmit, formState, control } = formMethods;

  const firstNationsChecked = useWatch({
    control,
    name: 'firstNations',
    defaultValue: false,
  });

  const { isSubmitting } = formState;

  const onSubmit = async (formData) => {
    formData.type = type;

    const createdRequirementTemplate = copyExisting
      ? await copyRequirementTemplate(formData)
      : await createRequirementTemplate(formData);

    if (createdRequirementTemplate) {
      onSuccess(createdRequirementTemplate);
    }
  };

  return (
    <FormProvider {...formMethods}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <VStack alignItems={'flex-start'} spacing={5} gap={8} w={'full'} h={'full'}>
          {/* <Text>{t('requirementTemplate.new.typePrompt')}</Text> */}

          <VStack display={'contents'}>
            <AsyncRadioGroup
              valueField="id"
              fetchOptions={fetchPermitTypeOptions}
              fieldName={'permitTypeId'}
              question={t('requirementTemplate.new.programQuestion')}
            />
            <Flex
              bg="greys.grey03"
              p={4}
              border="1px solid"
              borderColor="greys.grey02"
              borderRadius="sm"
              width="100%"
              direction="column"
            >
              <Text>{t('requirementTemplate.new.applicationName')}</Text>
              <TextFormControl mt={2} fieldName={'description'} required maxWidth="224px" />
            </Flex>
          </VStack>
          <Controller
            name="firstNations"
            control={control}
            defaultValue={false}
            render={({ field: { onChange, value } }) => (
              <Checkbox isChecked={value} onChange={onChange}>
                <Trans
                  i18nKey={'requirementTemplate.new.firstNationsLand'}
                  components={{
                    1: (
                      <Link
                        isExternal
                        href="https://services.aadnc-aandc.gc.ca/ILRS_Public/Home/Home.aspx?ReturnUrl=%2filrs_public%2f"
                      ></Link>
                    ),
                  }}
                />
              </Checkbox>
            )}
          />
          {firstNationsChecked && (
            <Checkbox isChecked={copyExisting} onChange={(e) => setCopyExisting(e.target.checked)}>
              {t('requirementTemplate.new.copyExistingByClassifications')}
            </Checkbox>
          )}

          <Flex direction="column" as="section" w="full">
            <TextFormControl label={t('requirementTemplate.fields.description')} fieldName={'description'} required />
            <Text fontSize="sm" color="border.base">
              {t('requirementTemplate.new.descriptionHelpText')}
            </Text>
          </Flex>

          <Flex gap={4}>
            <Button
              variant="primary"
              type="submit"
              isDisabled={!formState.isValid || isSubmitting}
              isLoading={isSubmitting}
              loadingText={t('ui.loading')}
            >
              {t('requirementTemplate.new.createButton')}
            </Button>
            <Button variant="secondary" ml={8} isDisabled={isSubmitting} onClick={() => navigate(-1)}>
              {t('ui.cancel')}
            </Button>
          </Flex>
        </VStack>
      </form>
    </FormProvider>
  );
});
