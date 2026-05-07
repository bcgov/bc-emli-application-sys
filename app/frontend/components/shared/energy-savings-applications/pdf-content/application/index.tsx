import { Page, Text, View } from '@react-pdf/renderer';
import { t } from 'i18next';
import * as R from 'ramda';
import React from 'react';
import { IPermitApplication } from '../../../../../models/energy-savings-application';
import { theme } from '../../../../../styles/theme';
import { generateUUID } from '../../../../../utils/utility-functions';
import { Footer } from '../shared/footer';
import { page } from '../shared/styles/page';

enum EComponentType {
  checkbox = 'checkbox',
  container = 'container',
  datagrid = 'datagrid',
  date = 'date',
  fieldset = 'fieldset',
  columns = 'columns',
  file = 'simplefile',
  number = 'number',
  panel = 'panel',
  radio = 'radio',
  select = 'select',
  checklist = 'selectboxes',
  email = 'simpleemail',
  phone = 'simplephonenumber',
  text = 'simpletextfield',
  textarea = 'textarea',
}

export const ApplicationFields = function ApplicationFields({
  permitApplication,
}: {
  permitApplication: IPermitApplication;
}) {
  return (
    <Page size="LETTER" style={page}>
      <View style={{ overflow: 'hidden' }}>
        {permitApplication.formattedFormJson?.components?.map((c) => (
          <FormComponent key={c.id} component={c} permitApplication={permitApplication} />
        )) || (
          <Text style={{ fontSize: 12, color: theme.colors.text.secondary, textAlign: 'center', marginTop: 50 }}>
            No form data available
          </Text>
        )}
      </View>
      <Footer permitApplication={permitApplication} />
    </Page>
  );
};

interface IFormComponentProps {
  permitApplication: IPermitApplication;
  component: any;
  dataPath?: string[];
}

const FormComponent = function ApplicationPDFFormComponent({
  permitApplication,
  component,
  dataPath,
}: IFormComponentProps) {
  // Helper function to check if a component has actual field data
  const hasFieldData = (comp) => {
    if (!comp || !comp.input) {
      return false;
    }

    const submissionData = permitApplication.submissionData?.data || {};
    let value = null;

    const toCamelCase = (str) => str.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
    const toUnderscoreCase = (str) => str.replace(/([A-Z])/g, '_$1').toLowerCase();
    const camelKey = comp.key ? toCamelCase(comp.key) : null;

    // Try direct lookup with both snake_case and camelCase keys
    for (const sectionKey of Object.keys(submissionData)) {
      const sectionData = submissionData[sectionKey];
      if (sectionData && typeof sectionData === 'object') {
        const matchKey =
          comp.key && comp.key in sectionData ? comp.key : camelKey && camelKey in sectionData ? camelKey : null;
        if (matchKey) {
          value = sectionData[matchKey];
          break;
        }
      }
    }

    // If not found, try with container path prefix
    if (value === null || value === undefined) {
      const existsAnywhere = Object.values(submissionData).some(
        (sec) => sec && typeof sec === 'object' && (comp.key in sec || (camelKey && camelKey in sec)),
      );
      if (existsAnywhere) {
        console.warn(`[PDF] Direct lookup missed for "${comp.key}" — key exists in data but direct path failed`);
      }
      for (const sectionKey of Object.keys(submissionData)) {
        const sectionData = submissionData[sectionKey];
        if (sectionData && typeof sectionData === 'object') {
          // Generate potential keys with both naming conventions
          const baseKey = comp.key;
          const camelCaseKey = toCamelCase(baseKey);
          const underscoreKey = toUnderscoreCase(baseKey);

          const potentialKeys = [
            baseKey,
            camelCaseKey,
            underscoreKey,
            dataPath && dataPath.length > 0 ? `${dataPath[0]}|${baseKey}` : null,
            dataPath && dataPath.length > 0 ? `${dataPath[0]}|${camelCaseKey}` : null,
            dataPath && dataPath.length > 0 ? `${dataPath[0]}|${underscoreKey}` : null,
            dataPath && dataPath.length > 0 && !dataPath[0].startsWith('formSubmissionDataRST')
              ? `formSubmissionDataRST${dataPath[0]}|${baseKey}`
              : null,
            dataPath && dataPath.length > 0 && !dataPath[0].startsWith('formSubmissionDataRST')
              ? `formSubmissionDataRST${dataPath[0]}|${camelCaseKey}`
              : null,
            dataPath && dataPath.length > 0 && !dataPath[0].startsWith('formSubmissionDataRST')
              ? `formSubmissionDataRST${dataPath[0]}|${underscoreKey}`
              : null,
          ]
            .filter((k) => k !== null && k !== baseKey && k !== camelCaseKey && k !== underscoreKey)
            .concat([baseKey, camelCaseKey, underscoreKey]); // Add base variants at the end

          for (const potentialKey of potentialKeys) {
            if (potentialKey in sectionData) {
              value = sectionData[potentialKey];
              break;
            }
          }
          if (value !== null && value !== undefined) break;
        }
      }
    }

    let hasData = false;

    // For checkboxes, 0 and false are valid data (but not empty string)
    if (comp.type === 'checkbox') {
      hasData = value !== null && value !== undefined && value !== '';
    }
    // For checklists, check if any options are selected
    else if (comp.type === 'selectboxes') {
      if (!value || typeof value !== 'object') {
        hasData = false;
      } else {
        hasData = Object.keys(value).some((key) => !!value[key]);
      }
    }
    // For file fields, check if files exist and are not empty arrays
    else if (comp.type === 'simplefile') {
      hasData = Array.isArray(value) && value.length > 0;
    }
    // For other fields, check if there's meaningful data
    else {
      hasData = value !== null && value !== undefined && value !== '';
    }

    return hasData;
  };

  const extractFields = (component) => {
    if (component.input) {
      // Only return component if it has both a label and actual data
      const hasLabel = component.label && component.label.trim() !== '';
      const hasData = hasFieldData(component);
      return hasLabel && hasData ? component : null;
    } else if (component.components || component.columns) {
      return R.map(extractFields, component.components || [component.columns[0]]);
    }
  };

  const fields = (components: any[]) => {
    return R.flatten(R.map(extractFields, components)).filter((outNull) => outNull);
  };

  const extractFieldInfo = (component) => {
    switch (component.type) {
      case EComponentType.checklist: {
        const options = R.path([dataPath, component.key], permitApplication.submissionData?.data || {});
        const label = component.label;
        const values: any = Object.keys(options ?? {}).filter((key) => !!options[key]);
        const hasData = values && values.length > 0;
        const hasLabel = !R.isNil(label) && label.trim() !== '';
        const isVisible = hasLabel && hasData;

        return { options, values, label, isVisible };
      }
      case EComponentType.datagrid: {
        return { value: null, label: null };
      }
      default:
        const label = component.label;
        let value = null;

        // Use the same logic as formio-helpers.ts for finding data
        const submissionData = permitApplication.submissionData?.data || {};
        const toCamelCase = (str) => str.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
        const toUnderscoreCase = (str) => str.replace(/([A-Z])/g, '_$1').toLowerCase();
        const camelKey = component.key ? toCamelCase(component.key) : null;

        // Try direct lookup with both snake_case and camelCase keys
        for (const sectionKey of Object.keys(submissionData)) {
          const sectionData = submissionData[sectionKey];
          if (sectionData && typeof sectionData === 'object') {
            const matchKey =
              component.key && component.key in sectionData
                ? component.key
                : camelKey && camelKey in sectionData
                  ? camelKey
                  : null;
            if (matchKey) {
              value = sectionData[matchKey];
              break;
            }
          }
        }

        // If not found, try with container path prefix (for complex form structures)
        if (value === null || value === undefined) {
          for (const sectionKey of Object.keys(submissionData)) {
            const sectionData = submissionData[sectionKey];
            if (sectionData && typeof sectionData === 'object') {
              // Generate potential keys with both naming conventions
              const baseKey = component.key;
              const camelCaseKey = toCamelCase(baseKey);
              const underscoreKey = toUnderscoreCase(baseKey);

              const potentialKeys = [
                baseKey,
                camelCaseKey,
                underscoreKey,
                dataPath && dataPath.length > 0 ? `${dataPath[0]}|${baseKey}` : null,
                dataPath && dataPath.length > 0 ? `${dataPath[0]}|${camelCaseKey}` : null,
                dataPath && dataPath.length > 0 ? `${dataPath[0]}|${underscoreKey}` : null,
                dataPath && dataPath.length > 0 && !dataPath[0].startsWith('formSubmissionDataRST')
                  ? `formSubmissionDataRST${dataPath[0]}|${baseKey}`
                  : null,
                dataPath && dataPath.length > 0 && !dataPath[0].startsWith('formSubmissionDataRST')
                  ? `formSubmissionDataRST${dataPath[0]}|${camelCaseKey}`
                  : null,
                dataPath && dataPath.length > 0 && !dataPath[0].startsWith('formSubmissionDataRST')
                  ? `formSubmissionDataRST${dataPath[0]}|${underscoreKey}`
                  : null,
              ].filter((k) => k !== null);

              for (const potentialKey of potentialKeys) {
                if (potentialKey in sectionData) {
                  value = sectionData[potentialKey];
                  break;
                }
              }
              if (value !== null && value !== undefined) break;
            }
          }
        }

        // Show field only if it has a label and actual data
        // For checkboxes, 0 and false are valid values, for others exclude empty strings
        const hasData =
          component.type === 'checkbox'
            ? value !== null && value !== undefined && value !== ''
            : value !== null && value !== undefined && value !== '';

        const hasLabel = !R.isNil(label) && label.trim() !== '';
        const isVisible = hasLabel && hasData;

        return { value, label, isVisible };
    }
  };

  switch (component.type) {
    case EComponentType.container: {
      dataPath = [component.key];
      const { components, columns } = component;
      const componentFields = fields(components || columns);

      // Only show container if it has components with actual data
      if (!components && !columns) return null;
      const hasAnyFieldData = componentFields.some((field) => hasFieldData(field));
      if (!hasAnyFieldData) return null;
      const firstChild: any = R.head(components);
      const additionalChildren: any = R.tail(components);

      return (
        <View>
          <View>
            <ContainerHeader component={component} />
            <FormComponent component={firstChild} dataPath={dataPath} permitApplication={permitApplication} />
          </View>
          {additionalChildren.map((child) => (
            <FormComponent
              key={generateUUID()}
              component={child}
              dataPath={dataPath}
              permitApplication={permitApplication}
            />
          ))}
        </View>
      );
    }
    case EComponentType.panel: {
      return (
        <View
          style={{
            borderColor: theme.colors.border.light,
            marginBottom: 24,
            width: '100%',
          }}
        >
          <PanelHeader component={component} />
          {component.components && (
            <View
              style={{
                gap: 4,
                borderBottomLeftRadius: 8,
                borderBottomRightRadius: 8,
                borderWidth: 1,
                borderColor: theme.colors.border.light,
                paddingTop: 12,
                paddingBottom: 12,
                paddingLeft: 24,
                paddingRight: 24,
              }}
            >
              {component.components.map((child) => (
                <FormComponent
                  key={generateUUID()}
                  component={child}
                  dataPath={dataPath}
                  permitApplication={permitApplication}
                />
              ))}
            </View>
          )}
        </View>
      );
    }
    case EComponentType.datagrid: {
      const values: any[] = (R.path([...dataPath, component.key], permitApplication.submissionData?.data || {}) ??
        []) as any[];

      const dataGridChildComponent = component?.components?.[0];

      return (
        <>
          {dataGridChildComponent &&
            Array.isArray(values) &&
            values.map((value, index) => (
              <FormComponent
                key={generateUUID()}
                component={dataGridChildComponent}
                dataPath={[...dataPath, component.key, index]}
                permitApplication={permitApplication}
              />
            ))}
        </>
      );
    }
    case EComponentType.fieldset:
      // Only show fieldset if it has components with actual data
      if (!component.components) return null;
      const fieldsetHasData = component.components.some((child) => hasFieldData(child));
      if (!fieldsetHasData) return null;

      return (
        <View
          style={{
            borderWidth: 1,
            borderColor: theme.colors.border.light,
            paddingLeft: 20,
            paddingRight: 20,
            paddingTop: 8,
            paddingBottom: 8,
            borderRadius: 4,
          }}
        >
          {component.components.map((child) => (
            <FormComponent
              key={generateUUID()}
              component={child}
              dataPath={dataPath}
              permitApplication={permitApplication}
            />
          ))}
        </View>
      );
    case EComponentType.columns:
      return (
        <>
          {component.columns && (
            <View style={{ flexDirection: 'row', gap: 20, width: '100%' }}>
              {component.columns.map((column, index) => {
                return column.components
                  .map((child) => {
                    return (
                      <View key={generateUUID()} style={{ flex: 1 }}>
                        <FormComponent
                          key={child.id}
                          component={child}
                          dataPath={dataPath}
                          permitApplication={permitApplication}
                        />
                      </View>
                    );
                  })
                  .flat();
              })}
            </View>
          )}
        </>
      );
    case EComponentType.file: {
      const { value, label, isVisible } = extractFieldInfo(component);
      return isVisible ? <FileField value={value} label={label} /> : null;
    }
    case EComponentType.checklist: {
      const { options, label, isVisible } = extractFieldInfo(component);
      return isVisible ? <ChecklistField options={options} label={label} /> : null;
    }
    case EComponentType.checkbox: {
      const { value, label, isVisible } = extractFieldInfo(component);
      return isVisible ? <CheckboxField value={value} label={label} /> : null;
    }
    case EComponentType.select: {
      const { value, label, isVisible } = extractFieldInfo(component);
      const option = component.data?.values?.find((opt: any) => opt.value === value);
      const displayValue = option?.label ?? value;
      return isVisible ? <InputField value={displayValue} label={label} /> : null;
    }
    case EComponentType.radio: {
      const { value, label, isVisible } = extractFieldInfo(component);
      const option = component.values?.find((opt: any) => opt.value === value);
      const displayValue = option?.label ?? value;
      return isVisible ? <InputField value={displayValue} label={label} /> : null;
    }
    case EComponentType.text:
    case EComponentType.textarea:
    case EComponentType.number:
    case EComponentType.phone:
    case EComponentType.date:
    case EComponentType.email: {
      const { value, label, isVisible } = extractFieldInfo(component);
      return isVisible ? <InputField value={value} label={label} /> : null;
    }
    default:
      console.warn(`[PDF] Unhandled component type "${component.type}" — field will be missing from PDF`);
      return null;
  }
};

const ContainerHeader = function ApplicationPDFContainerHeader({ component }) {
  return (
    <View style={{ marginTop: 32, paddingBottom: 15, gap: 8 }} wrap={false}>
      <View
        style={{
          borderWidth: 3,
          borderColor: theme.colors.theme.yellow,
          width: 27,
          backgroundColor: theme.colors.theme.yellow,
        }}
      />
      <Text style={{ fontSize: 20, fontWeight: 700 }}>{component.title}</Text>
    </View>
  );
};

const PanelHeader = function ApplicationPDFPanelHeader({ component }) {
  return (
    <View
      style={{
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        paddingTop: 8,
        paddingBottom: 8,
        paddingLeft: 24,
        paddingRight: 24,
        borderWidth: 1,
        borderBottomWidth: 0,
        borderColor: theme.colors.border.light,
        backgroundColor: theme.colors.greys.grey04,
        width: '100%',
      }}
      fixed
    >
      <Text style={{ fontSize: 12, fontWeight: 700 }}>{component.title}</Text>
    </View>
  );
};

const ChecklistField = function ApplicationPDFPanelChecklistField({ options, label }) {
  const hasOptions = options && typeof options === 'object' && Object.keys(options).length > 0;

  return (
    <View style={{ gap: 4, paddingTop: 4 }} wrap={false}>
      <Text
        style={{
          fontSize: 12,
          color: theme.colors.text.primary,
          paddingBottom: 4,
          marginBottom: 4,
        }}
      >
        {label}
      </Text>
      <View style={{ gap: 8 }}>
        {hasOptions ? (
          Object.keys(options).map((key) => {
            return <Checkbox key={key} isChecked={!!options[key]} label={key} />;
          })
        ) : (
          <Text style={{ fontSize: 10, color: theme.colors.text.secondary, fontStyle: 'italic' }}>
            No options selected
          </Text>
        )}
      </View>
    </View>
  );
};

const CheckboxField = function ApplicationPDFPanelCheckboxField({ value, label }) {
  return (
    <View style={{ gap: 4, paddingTop: 4 }} wrap={false}>
      <Checkbox isChecked={!!value} label={label} />
    </View>
  );
};

function Checkbox({ isChecked, label }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <View
        style={{
          width: 8,
          height: 8,
          borderColor: theme.colors.border.dark,
          borderWidth: isChecked ? 0 : 0.75,
          backgroundColor: isChecked ? theme.colors.text.primary : theme.colors.greys.white,
        }}
      />

      <Text style={{ fontSize: 12, color: theme.colors.text.primary }}>{label}</Text>
    </View>
  );
}

const InputField = function ApplicationPDFInputField({ value, label }) {
  // Show actual value, including 0 and false as valid values
  const displayValue = value !== null && value !== undefined && value !== '' ? String(value) : '';

  return <RequirementField label={label} value={displayValue} />;
};

const FileField = function ApplicationPDFFileField({ value, label }: { value: Record<string, any>[]; label: string }) {
  const fileExists = value && !R.isEmpty(value);

  return (
    <RequirementField
      label={label}
      value={fileExists ? R.pluck('originalName', value).join(', ') : t('permitApplication.pdf.fileNotAdded')}
    />
  );
};

function RequirementField({ label, value }) {
  return (
    <View style={{ gap: 4, paddingTop: 4 }} wrap={false}>
      <Label label={label} />
      <Input value={value} />
    </View>
  );
}

function Label({ label }) {
  return (
    <Text style={{ fontSize: 12, color: theme.colors.text.primary, paddingBottom: 4, marginBottom: 4 }}>{label}</Text>
  );
}

function Input({ value }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 28,
        borderColor: theme.colors.border.light,
        borderRadius: 4,
        borderWidth: 1,
        paddingTop: 6,
        paddingBottom: 6,
        marginBottom: 6,
        paddingLeft: 12,
        paddingRight: 12,
        fontSize: 12,
      }}
    >
      <Text>{value}</Text>
    </View>
  );
}
