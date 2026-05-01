import * as NumberEditValidationModule from 'formiojs/components/number/editForm/Number.edit.validation';
import common from '../../Common/Advanced.edit.validation.js';
import { reArrangeComponents } from '../../Common/function.js';
const toArray = (mod) => {
  if (Array.isArray(mod)) return mod;
  if (Array.isArray(mod?.default)) return mod.default;
  if (Array.isArray(mod?.default?.default)) return mod.default.default;
  return [];
};
const NumberEditValidation = toArray(NumberEditValidationModule);
const neededposition = [
  'validate.isUseForCopy',
  'validateOn',
  'validate.required',
  'validate.min',
  'validate.max',
  'errorLabel',
  'validate.customMessage',
  'errors',
  'custom-validation-js',
  'json-validation-json',
];
const newPosition = reArrangeComponents(neededposition, [...NumberEditValidation, ...common]);
export default newPosition;
