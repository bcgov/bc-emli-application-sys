// Override for the formio bootstrap select template.
//
// Form.io renders a hidden bridge input (formio-select-autocomplete-input)
// on every SELECT field to capture browser autofill. Chrome's address
// autofill targets this input and injects the user's country value
// ("Canada") into SELECT fields that have no country option.
//
// autocomplete="off" was tested on prod and Chrome ignores it for
// address autofill.
//
// style="display: none;" was deployed to prod and did NOT work. Form.io
// injects templates as HTML strings — the attribute is parsed into the DOM
// but the CSSOM style object stays empty, so the CSS class display:block wins.
//
// The `hidden` boolean attribute operates at the browser UA stylesheet level
// and bypasses the CSSOM entirely. Chrome's autofill scanner skips hidden
// elements.
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
       hidden
       autocomplete="off"
       style="display: none;"
       tabindex="-1"
       aria-label="${ctx.t('autocomplete')}"
/>`;
}
