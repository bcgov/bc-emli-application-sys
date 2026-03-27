// Override for the formio bootstrap select template.
//
// Form.io renders a hidden bridge input (formio-select-autocomplete-input)
// on every SELECT field to capture browser autofill. Chrome's address
// autofill targets this input and injects the user's country value
// ("Canada") into SELECT fields that have no country option.
//
// autocomplete="off" was tested on prod and Chrome ignores it for
// address autofill. display: none removes the bridge input from
// Chrome's DOM scanner entirely, preventing the injection.
//
// BCHEP-618

export function overrideSelectTemplate(ctx) {
  const refAttr = ctx.input.ref ? ctx.input.ref : 'selectContainer';
  const multipleAttr = ctx.input.multiple ? 'multiple' : '';

  let attrString = '';
  for (const attr in ctx.input.attr) {
    attrString += `\n  ${attr}="${ctx.input.attr[attr]}"`;
  }

  const idAttr = Object.prototype.hasOwnProperty.call(ctx.input.attr, 'id')
    ? ''
    : `\n  id="${ctx.instance.id}-${ctx.component.key}"`;

  const describedByAttr = ctx.component.description
    ? `\n  aria-describedby="d-${ctx.instance.id}-${ctx.component.key}"`
    : '';

  const required =
    ctx.input.ref === 'selectContainer' || !ctx.input.ref
      ? ctx.input.component.validate?.required
      : ctx.component.fields?.[ctx.input.ref]?.required;

  const ariaRequiredAttr = typeof required === 'undefined' ? '' : `\n  aria-required="${required ? 'true' : 'false'}"`;

  return `<select
  ref="${refAttr}"
  ${multipleAttr}
  ${attrString}
  ${idAttr}
  ${describedByAttr}${ariaRequiredAttr}
>${ctx.selectOptions}</select>
<input type="text"
       class="formio-select-autocomplete-input"
       ref="autocompleteInput"
       style="display: none;"
       tabindex="-1"
       aria-label="${ctx.t('autocomplete')}"
/>`;
}
