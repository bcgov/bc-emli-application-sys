import * as validationComponentsModule from 'formiojs/components/day/editForm/Day.edit.validation';
import common from '../../Common/Advanced.edit.validation.js';
import { reArrangeComponents } from '../../Common/function.js';
const toArray = (mod) => {
  if (Array.isArray(mod)) return mod;
  if (Array.isArray(mod?.default)) return mod.default;
  if (Array.isArray(mod?.default?.default)) return mod.default.default;
  return [];
};
const validationComponents = toArray(validationComponentsModule);
const neededposition = [
  'validate.isUseForCopy',
  'validateOn',
  'fields.day.required',
  'fields.month.required',
  'fields.year.required',
  'maxDate',
  'minDate',
  'unique',
  'errorLabel',
  'validate.customMessage',
  'custom-validation-js',
  'json-validation-json',
  'errors',
];
const newPosition = reArrangeComponents(neededposition, [...validationComponents, ...common]);
export default newPosition;
