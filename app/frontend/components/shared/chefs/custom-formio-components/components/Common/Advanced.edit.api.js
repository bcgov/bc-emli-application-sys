import * as ComponentEditApiModule from 'formiojs/components/_classes/component/editForm/Component.edit.api';
const toArray = (mod) => {
  if (Array.isArray(mod)) return mod;
  if (Array.isArray(mod?.default)) return mod.default;
  if (Array.isArray(mod?.default?.default)) return mod.default.default;
  return [];
};
export default [...toArray(ComponentEditApiModule)];
