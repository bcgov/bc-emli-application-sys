import { BoxProps, Stack } from '@chakra-ui/react';
import React from 'react';
import { ERequirementType } from '../../../../types/enums';
import { GenericMultiDisplay } from '../requirement-field-display/generic-multi-display';
import { EditableLabel, TEditableLabelProps } from './editable-label';
import { IsOptionalCheckbox, TIsOptionalCheckboxProps } from './is-optional-checkbox';

export type TServiceInformationEditProps<TFieldValues> = {
  editableLabelProps: TEditableLabelProps<TFieldValues>;
  isOptionalCheckboxProps: TIsOptionalCheckboxProps<TFieldValues>;
  fieldItems: Array<{
    type: ERequirementType;
    key: string;
    label: string;
    required?: boolean;
    containerProps?: BoxProps;
  }>;
  requirementType: ERequirementType;
};

export function ServiceInformationEdit<TFieldValues>({
  editableLabelProps,
  isOptionalCheckboxProps,
  fieldItems,
  requirementType,
}: TServiceInformationEditProps<TFieldValues>) {
  return (
    <Stack spacing={4}>
      <GenericMultiDisplay
        containerProps={{
          borderBottomRadius: 'none',
        }}
        requirementType={requirementType}
        fieldItems={fieldItems}
        renderHeading={() => <EditableLabel {...editableLabelProps} />}
      />
      <IsOptionalCheckbox {...isOptionalCheckboxProps} />
    </Stack>
  );
}
