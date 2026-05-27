import * as ComponentEditValidationModule from 'formiojs/components/_classes/component/editForm/Component.edit.validation';
import * as TextFieldEditValidationModule from 'formiojs/components/textfield/editForm/TextField.edit.validation';
import UseForCopy from './UseForCopy.js';

const toArray = (mod) => {
  if (Array.isArray(mod)) return mod;
  if (Array.isArray(mod?.default)) return mod.default;
  if (Array.isArray(mod?.default?.default)) return mod.default.default;
  return [];
};

const ComponentEditValidation = toArray(ComponentEditValidationModule);
const TextFieldEditValidation = toArray(TextFieldEditValidationModule);

const kickbox = {
  type: 'panel',
  label: 'Kickbox',
  title: 'Kickbox',
  weight: 102,
  key: 'kickbox',
  components: [
    {
      type: 'checkbox',
      label: 'Enable',
      tooltip: 'Enable Kickbox validation for this email field.',
      description: 'Validate this email using the Kickbox email validation service.',
      key: 'kickbox.enabled',
    },
  ],
};

export default [kickbox, UseForCopy, ...ComponentEditValidation, ...TextFieldEditValidation];
// const neededposition = [
//   'validate.isUseForCopy',
//   'validateOn',
//   'validate.required',
//   'unique',
//   'kickbox',
//   'validate.minLength',
//   'validate.maxLength',
//   'validate.minWords',
//   'validate.maxWords',
//   'validate.pattern',
//   'errorLabel',
//   'validate.customMessage',
//   'errors',
//   'custom-validation-js',
//   'json-validation-json'
// ];
// var newPosition = [];
// neededposition.map((posKey) => {
//     [kickbox,UseForCopy,...TextFieldEditValidation,...ComponentEditValidation].findIndex((comp) => {
//         if(comp.key === posKey){newPosition.push(comp);}
//     });
// })
// export default newPosition;
