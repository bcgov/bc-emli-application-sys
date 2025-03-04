export const storeEntryPoint = async (entryPoint: string) => {
  const csrfToken = (document.querySelector("[name=csrf-token]") as HTMLMetaElement).content;

  await fetch('/store_entry_point', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken
    },
    body: JSON.stringify({ entry_point: entryPoint })
  });
};