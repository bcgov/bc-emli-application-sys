import { Page, Text, View } from '@react-pdf/renderer';
import { t } from 'i18next';
import * as R from 'ramda';
import React from 'react';
import { IPermitApplication } from '../../../../../models/energy-savings-application';
import { theme } from '../../../../../styles/theme';
import { generateUUID } from '../../../../../utils/utility-functions';
import { Footer } from '../shared/footer';
import { page } from '../shared/styles/page';

const toCamelCase = (str: string) => str.replace(/_([a-z])/g, (_, l) => l.toUpperCase());

// Find a field value by matching the compound key suffix against submission data.
// Uses the last two key segments (e.g. "|RBuuid|email") to distinguish same-named
// fields across different form sections (e.g. two email fields in contractor forms).
const findFieldValue = (key: string | undefined, submissionData: Record<string, any>): any => {
  if (!key) return null;
  const parts = key.split('|');
  const suffix = parts[parts.length - 1];
  if (!suffix) return null;
  const camelSuffix = toCamelCase(suffix);
  // For compound keys, include the second-to-last segment to scope the match
  const specificSuffix = parts.length > 1 ? `${parts[parts.length - 2]}|${suffix}` : suffix;
  const specificCamelSuffix = parts.length > 1 ? `${parts[parts.length - 2]}|${camelSuffix}` : camelSuffix;

  for (const sectionData of Object.values(submissionData)) {
    if (!sectionData || typeof sectionData !== 'object') continue;
    // Exact match for simple keys stored without a compound path (e.g. `signed`)
    if (Object.prototype.hasOwnProperty.call(sectionData, suffix)) return sectionData[suffix];
    if (camelSuffix !== suffix && Object.prototype.hasOwnProperty.call(sectionData, camelSuffix))
      return sectionData[camelSuffix];
    // Specific suffix match using last 2 segments — avoids false matches when multiple
    // sections contain fields with the same name (e.g. two email fields)
    const matchKey = Object.keys(sectionData).find(
      (k) => k.endsWith(`|${specificCamelSuffix}`) || k.endsWith(`|${specificSuffix}`),
    );
    if (matchKey !== undefined) return sectionData[matchKey];
  }
  return null;
};

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
  const hasFieldData = (comp) => {
    if (!comp || !comp.input) return false;
    const submissionData = permitApplication.submissionData?.data || {};
    const value = findFieldValue(comp.key, submissionData);

    if (comp.type === 'selectboxes') {
      return value && typeof value === 'object' && Object.keys(value).some((key) => !!value[key]);
    }
    if (comp.type === 'simplefile') {
      return Array.isArray(value) && value.length > 0;
    }
    return value !== null && value !== undefined && value !== '';
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
        const options = findFieldValue(component.key, permitApplication.submissionData?.data || {});
        const label = component.label;
        const hasData = options && typeof options === 'object' && Object.keys(options).some((key) => !!options[key]);
        const hasLabel = !R.isNil(label) && label.trim() !== '';
        const isVisible = hasLabel && hasData;

        return { options, label, isVisible };
      }
      case EComponentType.datagrid: {
        return { value: null, label: null };
      }
      default:
        const label = component.label;
        const submissionData = permitApplication.submissionData?.data || {};
        const value = findFieldValue(component.key, submissionData);
        const hasData = value !== null && value !== undefined && value !== '';
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
      return isVisible ? <ChecklistField options={options} label={label} valueDefinitions={component.values} /> : null;
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
    case 'button':
    case 'choicesjs':
    case 'content':
    case 'htmlelement':
      return null;
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

const ChecklistField = function ApplicationPDFPanelChecklistField({ options, label, valueDefinitions }) {
  const selectedKeys =
    options && typeof options === 'object' ? Object.keys(options).filter((key) => !!options[key]) : [];

  const getLabel = (key: string) => {
    const match = valueDefinitions?.find((v: any) => v.value === key);
    return match?.label ?? key;
  };

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
        {selectedKeys.length > 0 ? (
          selectedKeys.map((key) => <Checkbox key={key} isChecked={true} label={getLabel(key)} />)
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
