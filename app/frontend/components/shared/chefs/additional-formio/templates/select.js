// Override for the formio bootstrap select template.
//
// Form.io renders a hidden bridge input (formio-select-autocomplete-input)
// on every SELECT field to capture browser autofill. Chrome's address
// autofill targets this input and injects the user's country value
// ("Canada") into SELECT fields that have no country option.
//
// autocomplete="off" was tested on prod — Chrome ignores it for address
// autofill. Retained as a fallback for other browsers.
//
// style="display: none;" was deployed to prod and did NOT prevent autofill.
// Form.io injects templates as HTML strings and the inline style on this
// bridge input was not preserved as an effective element.style rule in the
// final rendered DOM — it was stripped or overwritten by Form.io's runtime
// behaviour — so the input remained a visible autofill target.
// Retained as a fallback in case Form.io's runtime behaviour changes.
//
// The `hidden` boolean attribute is applied by the browser's UA stylesheet
// and is respected by Chrome's autofill scanner, which skips elements
// marked as hidden. This is the fix that works.
//
// All three are intentionally present. One of these should work.
// Display and autofill didn't appear to resolve this. Hidden is my final attempt.
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
