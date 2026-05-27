import * as ComponentEditLayoutModule from 'formiojs/components/_classes/component/editForm/Component.edit.layout';
const toArray = (mod) => {
  if (Array.isArray(mod)) return mod;
  if (Array.isArray(mod?.default)) return mod.default;
  if (Array.isArray(mod?.default?.default)) return mod.default.default;
  return [];
};
export default [...toArray(ComponentEditLayoutModule)];
