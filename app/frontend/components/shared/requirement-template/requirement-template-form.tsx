import { Button, Checkbox, Flex, Link, Text, VStack } from '@chakra-ui/react';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { Trans, useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { IRequirementTemplate } from '../../../models/requirement-template';
import { useMst } from '../../../setup/root';
import { EProgramUserGroupType, ERequirementTemplateType } from '../../../types/enums';
import { IOption, TCreateRequirementTemplateFormData } from '../../../types/types';
import { AsyncRadioGroup } from '../base/inputs/async-radio-group';
import { TextFormControl } from '../form/input-form-control';
import { HStack } from '../../domains/step-code/checklist/pdf-content/shared/h-stack';
import { useSearch } from '../../../hooks/use-search';
import { AsyncDropdown } from '../base/inputs/async-dropdown';
interface IRequirementTemplateFormProps {
  type: ERequirementTemplateType;
  onSuccess: (createdRequirementTemplate: IRequirementTemplate) => void;
}

// interface IOption<T> {
//   value: T;
//   label: string;
// }

export const RequirementTemplateForm = observer(({ type, onSuccess }: IRequirementTemplateFormProps) => {
  const { t } = useTranslation();
  const {
    requirementTemplateStore: { createRequirementTemplate, copyRequirementTemplate },
    permitClassificationStore: { fetchAudienceTypeOptions, fetchUserGroupTypeOptions, fetchSubmissionTypeOptions },
  } = useMst();
  const { programStore } = useMst();
  const {
    tablePrograms,
    currentPage,
    totalPages,
    totalCount,
    countPerPage,
    handleCountPerPageChange,
    handlePageChange,
    isSearching,
  } = programStore;

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

  const onSubmit = async (formData: TCreateRequirementTemplateFormData) => {
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
              fetchOptions={fetchUserGroupTypeOptions}
              fieldName={'userGroupTypeId'}
            />
            <AsyncRadioGroup
              valueField="id"
              question={t('requirementTemplate.fields.audienceTypeSelect')}
              fetchOptions={fetchAudienceTypeOptions}
              fieldName={'audienceTypeId'}
            />
            <AsyncDropdown
              fetchOptions={fetchSubmissionTypeOptions}
              fieldName={'submissionTypeId'}
              question={t('requirementTemplate.fields.submissionTypeSelect')}
              useBoxWrapper={true}
            />
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

          {/* <Controller
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
                      />
                    ),
                  }}
                />
              </Checkbox>
            )}
          /> */}
          {/* {firstNationsChecked && (
            <Checkbox isChecked={copyExisting} onChange={(e) => setCopyExisting(e.target.checked)}>
              {t('requirementTemplate.new.copyExistingByClassifications')}
            </Checkbox>
          )} */}

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
