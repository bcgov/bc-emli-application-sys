import * as ComponentEditDataModule from 'formiojs/components/_classes/component/editForm/Component.edit.data';
import * as TextFieldEditDataModule from 'formiojs/components/textfield/editForm/TextField.edit.data';
const toArray = (mod) => {
  if (Array.isArray(mod)) return mod;
  if (Array.isArray(mod?.default)) return mod.default;
  if (Array.isArray(mod?.default?.default)) return mod.default.default;
  return [];
};
export default [...toArray(ComponentEditDataModule), ...toArray(TextFieldEditDataModule)];
