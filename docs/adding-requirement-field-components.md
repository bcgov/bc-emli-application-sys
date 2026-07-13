# Adding Requirement Field Components

This guide describes how to add a new requirement field component to the database-driven form template system.

The system has two separate experiences that must stay in sync:

1. The system admin requirement builder, where admins add fields to requirement blocks.
2. The applicant/reviewer Form.io form, where saved requirement definitions are rendered into a real form.

Adding an enum value or a drawer item is not enough. A complete field type needs builder metadata, backend persistence support, backend Form.io JSON generation, and tests.

## Mental Model

Requirement templates are built from sections, requirement blocks, and requirements.

At a high level:

1. A system admin opens the requirement block modal.
2. The frontend lists available field types from `ERequirementType`.
3. When the admin selects a field, the builder appends a requirement definition to `requirementsAttributes`.
4. The Rails API persists those attributes as `requirements` rows.
5. Template publication or application rendering asks the backend for Form.io JSON.
6. `RequirementFormJsonService` converts each `Requirement` row into the Form.io component JSON used by the runtime form.
7. The shared CHEFS/Form.io wrapper renders the generated Form.io JSON.

The important consequence: the frontend builder preview and the backend Form.io output are independent. The builder can show a field that still cannot render correctly in the actual application form unless the backend JSON path is implemented.

## Existing Component Patterns

Use the closest existing pattern as the starting point.

### Simple Field Type

Examples: `text`, `phone`, `email`, `utility_account_number`

Use this when the new field is still one Form.io input, possibly with validation or custom options.

Main implementation points:

- Frontend enum and builder display/edit components.
- Rails enum.
- `RequirementFormJsonService::DEFAULT_FORMIO_TYPE_TO_OPTIONS` entry.
- Optional validation in `RequirementFormJsonService#to_form_json` or `Requirement`.

`utility_account_number` is a useful example because it renders as a text field but adds backend-generated validation:

```ruby
if requirement.input_type_utility_account_number?
  json[:validate] = (json[:validate] || {}).merge(
    {
      maxLength: 12,
      pattern: "^[0-9]{1,12}$",
      customMessage: I18n.t("formio.requirement.utility_account_number.validation_message")
    }
  )
end
```

### Compound Single Requirement

Examples: `service_information`, `pid_info`, `general_contact`, `professional_contact`

Use this when one requirement row should render multiple nested Form.io fields, such as a fieldset or data grid.

Main implementation points:

- One `Requirement` row in the database.
- Custom branch in `RequirementFormJsonService#to_form_json`.
- Helper methods that return the nested Form.io JSON.
- Builder display/edit UI that communicates the nested structure to system admins.

`service_information` is a good reference for repeated nested data. It renders one requirement as a Form.io `datagrid` containing a fieldset with employee name and employee email.

### Requirement Package

Example: `energy_step_code`

Use this when selecting one option in the builder should create several related requirements that must be kept together.

Main implementation points:

- Special logic in `FieldsSetup#onUseRequirement`.
- Required schema constants on both frontend and backend.
- Backend validations that prevent partial or malformed packages.
- Removal logic that removes the package as a group.

This is the highest-maintenance path. Use it only when the component really is a bundle of separate persisted requirements.

### New Custom Form.io Component Class

Use this when built-in Form.io components and JSON composition are not enough.

Main implementation points:

- Add a custom Form.io component under `app/frontend/components/shared/chefs/custom-formio-components/components`.
- Export it from `app/frontend/components/shared/chefs/custom-formio-components/components/index.js`.
- Make backend Form.io JSON emit the custom `type`.
- Ensure the shared CHEFS wrapper registers the component before forms render.

The app registers custom Form.io components through `app/frontend/components/shared/chefs/index.tsx` via `Formio.use(ChefsFormioComponents)`.

## Naming Conventions

Use three related names consistently:

| Layer                | Convention        | Example                      |
| -------------------- | ----------------- | ---------------------------- |
| TypeScript enum key  | camelCase         | `utilityAccountNumber`       |
| Persisted enum value | snake_case        | `utility_account_number`     |
| Rails enum key       | snake_case symbol | `utility_account_number: 21` |

Requirement codes become part of Form.io keys and conditional paths. Avoid characters that `Requirement` already rejects in `requirement_code`: `|`, `.`, `=`, and `>`.

For file inputs, requirement codes must end in `_file`. `Requirement#set_requirement_code` automatically adds the suffix when needed.

## Step-by-Step Implementation

### 1. Add the Frontend Requirement Type

Update `app/frontend/types/enums.ts`.

Add a new value to `ERequirementType`:

```ts
export enum ERequirementType {
  // ...existing values
  mySpecialField = 'my_special_field',
}
```

This makes the type available to frontend models and builder code. It does not automatically make the field visible in the drawer; visibility depends on the display component map described below.

### 2. Add the Rails Requirement Enum

Update `app/models/requirement.rb`.

Add the new value to the `enum :input_type` map:

```ruby
enum :input_type,
     {
       # ...existing values
       utility_account_number: 21,
       my_special_field: 22
     },
     prefix: true
```

Important: append the new enum value using the next integer. Do not insert it between existing values. The database stores `requirements.input_type` as an integer, so changing existing enum numbers changes the meaning of existing data.

Usually this does not require a database migration because the column is already an integer and Rails owns the mapping. Confirm there is no separate DB check constraint before assuming that in future changes.

After adding the enum, Rails gives you helper methods such as:

```ruby
requirement.input_type_my_special_field?
```

### 3. Add the Builder Drawer Label

Update `app/frontend/i18n/i18n.ts` under `requirementsLibrary.requirementTypeLabels`:

```ts
requirementTypeLabels: {
  // ...existing labels
  mySpecialField: 'My special field',
}
```

The label lookup uses the TypeScript enum key, not the snake_case persisted value. For `ERequirementType.mySpecialField = 'my_special_field'`, the translation key is `mySpecialField`.

The helper responsible for this is `getRequirementTypeLabel` in `app/frontend/constants/index.ts`.

### 4. Add Builder Display UI

Update `app/frontend/components/domains/requirements-library/requirement-field-display/index.tsx`.

Add the new type to `requirementsComponentMap`:

```tsx
[ERequirementType.mySpecialField](props: TRequirementFieldDisplayProps) {
  return <GenericFieldDisplay inputDisplay={<Input bg="white" />} {...props} />;
},
```

This controls the read-only preview shown in the requirement block modal and the field setup drawer.

The field setup drawer filters options with `hasRequirementFieldDisplayComponent`. If the display map does not include your new type, it will not appear in the drawer even though it exists in `ERequirementType`.

For compound fields, use `GenericMultiDisplay` or `GenericContactDisplay` as examples. `serviceInformation`, `pidInfo`, `generalContact`, and `professionalContact` show how to preview nested field layouts.

### 5. Add Builder Edit UI

Update `app/frontend/components/domains/requirements-library/requirement-field-edit/index.tsx`.

Add the new type to its `requirementsComponentMap`:

```tsx
[ERequirementType.mySpecialField]: function <TFieldValues>(props: TRequirementEditProps<TFieldValues>) {
  return <EditableGroup editableInput={<Input bg="white" isReadOnly />} {...props} />;
},
```

This controls the edit mode inside the requirement block modal.

Use existing helpers where possible:

- `EditableGroup` for single fields.
- `GenericContactEdit` for contact-style fields.
- `ServiceInformationEdit` or `PidInfoEdit` for nested preview fields plus label/required controls.
- `multiOptionProps` for select/radio/multi-option fields.
- `unitSelectProps` for number fields.
- `canAddMultipleContactProps` only for contact fields.

`RequirementFieldEdit` strips props that do not apply to the selected type before passing props into the mapped component. If your new type needs a new category of edit prop, update that prop filtering carefully.

### 6. Add Default Builder Behavior When Selected

Update `app/frontend/components/domains/requirements-library/requirements-block-modal/fields-setup.tsx` if the default behavior is not enough.

Most field types use this default shape when selected:

```ts
const defaults = {
  requirementCode: `dummy-${uuidv4()}`,
  id: `dummy-${uuidv4()}`,
  inputType: requirementType,
  label: undefined,
};
```

The backend later replaces dummy requirement codes with label-derived codes in `Requirement#set_requirement_code`.

You only need custom builder defaults when the type requires special options or labels. Existing examples:

- Contact fields default to `requirementsLibrary.modals.defaultContactLabel`.
- `serviceInformation` defaults its label to `requirementsLibrary.requirementTypeLabels.serviceInformation`.
- Multi-option types get default `valueOptions`.
- `energyStepCode` appends multiple related requirement definitions instead of one.

For a simple specialized field, you may only need to add a default label:

```ts
label:
  requirementType === ERequirementType.mySpecialField
    ? t('requirementsLibrary.requirementTypeLabels.mySpecialField')
    : undefined,
```

For new `inputOptions`, also update the API strong params described later.

### 7. Generate Runtime Form.io JSON

Update `app/services/requirement_form_json_service.rb`.

This is the most important runtime step. It controls what applicants and reviewers actually see.

For a simple field that maps to an existing Form.io type, add it to `DEFAULT_FORMIO_TYPE_TO_OPTIONS`:

```ruby
DEFAULT_FORMIO_TYPE_TO_OPTIONS = {
  # ...existing values
  my_special_field: {
    type: "simpletextfield"
  }
}
```

The generic `to_form_json` branch emits this base shape:

```ruby
{
  id: requirement.id,
  key: requirement.key(requirement_block_key),
  type: requirement.input_type,
  requirementInputType: requirement.input_type,
  input: true,
  label: requirement.label,
  widget: {
    type: "input"
  }
}.merge!(formio_type_options)
```

`formio_type_options` overrides `type` and adds Form.io-specific settings.

For a compound field, add a custom branch before the generic branch:

```ruby
json =
  if requirement.input_type_my_special_field?
    get_my_special_field_components(requirement_block_key, requirement.required)
  else
    # existing generic branch
  end
```

Then add helper methods that return valid Form.io component JSON. Use these existing helpers as references:

- `get_contact_form_json`
- `get_pid_info_components`
- `get_service_information_components`
- `get_nested_info_component`
- `multi_data_grid_form_json`
- `get_service_information_data_grid_form_json`

Make sure the returned JSON includes the original requirement `id` at the top-level rendered component when review/revision flows need to link back to the requirement row.

### 8. Add Runtime Validation, If Needed

Validation can live in two places depending on what it protects.

Use `RequirementFormJsonService#to_form_json` for Form.io/client validation that should be enforced in the rendered form, such as max length, regex pattern, or required fields.

Use `Requirement` model validations for database invariants, such as:

- The type only accepts certain `input_options`.
- Related package fields must exist together.
- A field must use a specific `requirement_code`.
- A value must be one of a fixed list.

Existing examples in `Requirement`:

- `validate_value_options`
- `validate_unit_for_number_inputs`
- `validate_can_add_multiple_contacts`
- `validate_energy_step_code_requirement_code`
- `validate_energy_step_code_related_requirements_schema`

### 9. Permit New Input Options Through the API

If the builder sends new nested `input_options`, update strong params in `app/controllers/api/requirement_blocks_controller.rb`.

Current permitted options include:

```ruby
input_options: [
  :number_unit,
  :can_add_multiple_contacts,
  :energy_step_code,
  value_options: [%i[value label]],
  conditional: %i[eq show when hide],
  computed_compliance: [:value, :module, options_map: {}]
]
```

If your component needs something like `input_options: { max_rows: 3 }`, add `:max_rows` here. If you forget this step, the frontend may appear to save successfully while Rails silently drops the option.

### 10. Register a New Custom Form.io Component, If Needed

Skip this step if the backend can compose the field from existing Form.io component types.

If you need a real custom Form.io type:

1. Create a component folder under `app/frontend/components/shared/chefs/custom-formio-components/components`.
2. Implement `Component.js`, usually extending a Form.io parent component.
3. Export it from `app/frontend/components/shared/chefs/custom-formio-components/components/index.js`.
4. Emit its `type` from `RequirementFormJsonService`.

A minimal custom component resembles:

```js
import { Components } from 'formiojs';

const ParentComponent = Components.components.textfield;
const ID = 'my_special_formio_type';
const DISPLAY = 'My special field';

export default class Component extends ParentComponent {
  static schema(...extend) {
    return ParentComponent.schema(
      {
        label: DISPLAY,
        type: ID,
        key: ID,
      },
      ...extend,
    );
  }

  static get builderInfo() {
    return {
      title: DISPLAY,
      group: 'advanced',
      icon: 'terminal',
      weight: 70,
      schema: Component.schema(),
    };
  }
}
```

Then register it from `components/index.js`:

```js
import myspecialformiotype from './MySpecialFormioType/Component.js';

export default {
  // ...existing components
  my_special_formio_type: myspecialformiotype,
};
```

`app/frontend/components/shared/chefs/index.tsx` already calls `Formio.use(ChefsFormioComponents)`, so exported components are registered when the shared form wrapper loads.

### 11. Add Styling, If Needed

Runtime Form.io styles live in `app/frontend/components/shared/chefs/styles.scss`.

Prefer adding a `custom_class` in backend Form.io JSON and styling that class, especially for compound fields:

```ruby
custom_class: "my-special-field-grid"
```

Then target it in SCSS:

```scss
.my-special-field-grid {
  // styles
}
```

Avoid relying on generated Form.io DOM structure unless there is no stable class available.

### 12. Account for Applicant Form Behavior

The runtime form is rendered from `RequirementForm` in `app/frontend/components/shared/energy-savings-applications/requirement-form.tsx`.

Most field types require no special handling there. Add logic only when the field has behavior outside normal Form.io data entry.

Existing examples:

- File fields trigger autosave because Form.io does not mark file updates pristine in the expected way.
- Address-like fields can update the application name for users without a physical address.
- Custom events such as `openStepCode`, `openAutofillContact`, and `openPreviousSubmission` open modals or routes.

If your component dispatches a custom DOM event, register and clean it up in a `useEffect` in `RequirementForm`.

### 13. Account for Revision, Diff, and Traversal Behavior

Most components work with existing traversal helpers as long as the Form.io JSON shape uses normal `components` arrays and stable keys.

Check these files if the new component nests fields or stores data in an unusual shape:

- `app/frontend/utils/formio-component-traversal.ts`
- `app/frontend/utils/formio-submission-traversal.ts`
- `app/frontend/utils/formio-helpers.ts`
- `app/frontend/models/permit-application.ts`
- `app/frontend/models/energy-savings-application.ts`

Contact fields are special because they add another nested layer. If your component behaves similarly, inspect the existing contact-specific handling before changing traversal logic.

### 14. Account for External APIs, Export, and Imports

If the field should appear in external API payloads, template export/import, reports, or sync tooling, search for assumptions about known input types.

Likely areas:

- `app/services/template_export_service.rb`
- `app/services/external_permit_application_service.rb`
- `app/services/template_versioning_service.rb`
- `docs/requirement-template-sync.md`
- request specs under `spec/requests/external_api`

Simple fields may need no changes. Nested or compound fields often need explicit mapping so submitted values are readable outside Form.io.

## Testing Checklist

At minimum, add backend model coverage in `spec/models/requirement_spec.rb`.

Recommended tests:

1. The new `input_type` is accepted by the Rails enum.
2. `Requirement#to_form_json` returns the expected Form.io JSON.
3. Required fields include `validate: { required: true }` where expected.
4. Custom validation rules are present in generated Form.io JSON.
5. Invalid `input_options` are rejected if the type has model-level invariants.
6. Compound field JSON includes stable keys, nested components, and the requirement `id` where needed.
7. Requirement package types validate that required related requirements exist and cannot be malformed.

For frontend tests, add coverage if there is an existing test harness for the builder component being changed. Useful targets are:

- The field appears in `FieldsSetupDrawer`.
- Selecting it appends the expected `requirementsAttributes` shape.
- The preview display renders the expected nested fields.
- Edit mode exposes the expected controls.

## Manual QA Checklist

Use the UI to verify the complete flow:

1. Sign in as a system admin.
2. Open a requirement block in the requirements library.
3. Click Add in the field setup drawer.
4. Confirm the new component appears with the expected label and preview.
5. Add the component to a block.
6. Edit its label, required state, helper text, conditionals, and any custom options.
7. Save the requirement block.
8. Reopen the block and confirm the field persisted correctly.
9. Attach the block to a template and publish or preview the template.
10. Start or view an application using that template.
11. Confirm the runtime Form.io field renders correctly.
12. Submit invalid data and confirm validation works.
13. Submit valid data and confirm the submission payload has the expected shape.
14. Test revision request, previous submission, diff, PDF/export, and external API paths if the component is nested or specialized.

## Common Pitfalls

### The field does not appear in the drawer

Check that `RequirementFieldDisplay` has a `requirementsComponentMap` entry for the new `ERequirementType`. The drawer filters out types without display components.

Also check that the drawer is not explicitly filtering the type. For example, `address` is currently filtered out because its backend Form.io implementation is incomplete.

### The field appears in the builder but not in the real form

Check `RequirementFormJsonService`. The applicant form uses backend-generated Form.io JSON, not the builder preview component.

### Rails rejects the input type

Check `Requirement`'s `enum :input_type`. The persisted snake_case value must exist in the Rails enum.

### Existing data changed meaning after the enum edit

The Rails enum was likely inserted in the middle instead of appended. Because `requirements.input_type` is stored as an integer, existing integer values map to whatever symbol currently owns that integer.

### New options disappear after saving

Check `Api::RequirementBlocksController#requirement_block_params`. Unpermitted nested `input_options` are dropped by strong params.

### Conditionals do not work

Conditionals assume the `when` target is another requirement code in the same requirement block. `RequirementBlock#validate_requirements_conditional` enforces this, and `RequirementFormJsonService` rewrites `when` into a full Form.io path.

### Nested submitted data is hard to find

Inspect the generated Form.io keys. Compound helpers may add fieldset or data grid suffixes such as `|service_info_v2`, `|multi_contact`, or camel-cased child field names.

### Review or revision links do not point to the right field

Check whether the top-level generated component includes the requirement `id` and a stable `key`. Revision and error UI rely on generated Form.io metadata.

## Example: Simple Specialized Text Field

Goal: add `my_special_field`, a text input with a label and max length.

Frontend enum:

```ts
mySpecialField = 'my_special_field',
```

Rails enum:

```ruby
my_special_field: 22
```

Frontend translation:

```ts
mySpecialField: 'My special field',
```

Builder display:

```tsx
[ERequirementType.mySpecialField](props: TRequirementFieldDisplayProps) {
  return <GenericFieldDisplay inputDisplay={<Input bg="white" />} {...props} />;
},
```

Builder edit:

```tsx
[ERequirementType.mySpecialField]: function <TFieldValues>(props: TRequirementEditProps<TFieldValues>) {
  return <EditableGroup editableInput={<Input bg="white" isReadOnly />} {...props} />;
},
```

Backend Form.io mapping:

```ruby
DEFAULT_FORMIO_TYPE_TO_OPTIONS = {
  # ...existing values
  my_special_field: {
    type: "simpletextfield"
  }
}
```

Backend validation in `to_form_json`:

```ruby
if requirement.input_type_my_special_field?
  json[:validate] = (json[:validate] || {}).merge(maxLength: 50)
end
```

Spec expectation:

```ruby
it "returns correct form json for my special field" do
  requirement = create(:requirement, label: "My Special Field", input_type: "my_special_field")

  form_json = requirement.to_form_json.reject { |key| key == :id }

  expect(form_json).to include(
    key: "#{requirement.requirement_block.key}|my_special_field",
    type: "simpletextfield",
    input: true,
    label: "My Special Field",
    requirementInputType: "my_special_field",
    validate: include(maxLength: 50)
  )
end
```

## Example: Compound Repeated Field

Goal: add one persisted requirement that renders a repeated group of nested fields.

Use `service_information` as the main reference:

- Frontend preview: `ERequirementType.serviceInformation` in `RequirementFieldDisplay`.
- Frontend edit: `ERequirementType.serviceInformation` in `RequirementFieldEdit`.
- Backend runtime JSON: `get_service_information_components` and `get_service_information_data_grid_form_json`.
- Runtime styles: `.service-information-grid` in `styles.scss`.

For a new repeated field:

1. Create a new enum value.
2. Add builder preview fields through `GenericMultiDisplay`.
3. Add builder edit fields through a small edit component similar to `ServiceInformationEdit`.
4. Add a `RequirementFormJsonService#to_form_json` branch.
5. Return a `datagrid` with a nested `fieldset` or columns as needed.
6. Use stable keys for each nested child field.
7. Add tests for generated JSON and submitted-data shape.

## Files Usually Touched

For a simple field:

- `app/frontend/types/enums.ts`
- `app/frontend/i18n/i18n.ts`
- `app/frontend/components/domains/requirements-library/requirement-field-display/index.tsx`
- `app/frontend/components/domains/requirements-library/requirement-field-edit/index.tsx`
- `app/models/requirement.rb`
- `app/services/requirement_form_json_service.rb`
- `spec/models/requirement_spec.rb`

For a field with custom input options, also touch:

- `app/controllers/api/requirement_blocks_controller.rb`
- `app/frontend/types/api-request.ts`
- `app/frontend/types/types.ts`
- Any builder control components needed for editing those options.

For a custom Form.io class, also touch:

- `app/frontend/components/shared/chefs/custom-formio-components/components/...`
- `app/frontend/components/shared/chefs/custom-formio-components/components/index.js`
- `app/frontend/components/shared/chefs/custom-formio-components/index.d.ts`, if TypeScript declarations are kept in sync.

For nested fields or unusual submitted data, also inspect:

- `app/frontend/utils/formio-component-traversal.ts`
- `app/frontend/utils/formio-submission-traversal.ts`
- `app/frontend/models/permit-application.ts`
- `app/frontend/models/energy-savings-application.ts`
- `app/services/external_permit_application_service.rb`
- `app/services/template_export_service.rb`

## Definition of Done

A new requirement field component is done when:

- It appears in the system admin field setup drawer with the correct label.
- It has a meaningful builder preview.
- It can be edited in the requirement block modal.
- It saves and reloads without losing data.
- The backend accepts the `input_type` and any `input_options`.
- `Requirement#to_form_json` emits valid Form.io JSON.
- The runtime application form renders the field correctly.
- Required state, helper text, conditionals, computed compliance, and custom validation work as applicable.
- Submission data has the expected shape.
- Tests cover backend JSON generation and any new invariants.
- Manual QA covers builder, runtime form, validation, save/reload, and any review/revision/export paths affected by the field.
