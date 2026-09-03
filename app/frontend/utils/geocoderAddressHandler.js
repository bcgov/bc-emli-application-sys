/**
 * Handler for geocoder address field selection
 * Populates address breakdown fields when an address is selected
 */

export function setupGeocoderAddressHandlers(formInstance) {
  if (!formInstance) {
    return;
  }

  // Find all geocoder search select fields
  const searchFields = formInstance
    .getComponents()
    .filter((component) => component.key && component.key.includes('geocoder_search'));

  searchFields.forEach((searchField) => {
    // Extract the parent key (e.g., "requirement_block_1|geocoder_search" -> "requirement_block_1")
    const parentKey = searchField.key.replace('|geocoder_search', '');

    // Listen for value changes
    searchField.on('change', (value) => {
      if (!value) {
        return;
      }

      handleAddressSelection(formInstance, parentKey, value);
    });
  });
}

function handleAddressSelection(formInstance, parentKey, selectedValue) {
  if (!selectedValue) {
    return;
  }

  // Extract the first part (street address) for API call
  const searchTerm = typeof selectedValue === 'string' ? selectedValue.split(',')[0] : selectedValue;

  // Call the geocoder API to get full details
  fetch(`/api/geocoder/address_search?address=${encodeURIComponent(searchTerm)}`)
    .then((response) => response.json())
    .then((result) => {
      if (result.data && result.data.length > 0) {
        // Find the matching result
        const match = result.data.find((item) => item.value === selectedValue || item.label === selectedValue);

        if (match) {
          updateAddressFields(formInstance, parentKey, match);
        }
      }
    })
    .catch((error) => {
      console.error('Error fetching address details:', error);
    });
}

function updateAddressFields(formInstance, parentKey, addressData) {
  try {
    // Find the breakdown fields using the parent key
    const streetFieldKey = `${parentKey}|streetAddress`;
    const cityFieldKey = `${parentKey}|city`;
    const provinceFieldKey = `${parentKey}|province`;

    const streetComponent = formInstance.getComponent(streetFieldKey);
    const cityComponent = formInstance.getComponent(cityFieldKey);
    const provinceComponent = formInstance.getComponent(provinceFieldKey);

    if (streetComponent && addressData.streetAddress) {
      streetComponent.setValue(addressData.streetAddress);
    }
    if (cityComponent && addressData.localityName) {
      cityComponent.setValue(addressData.localityName);
    }
    if (provinceComponent && addressData.provinceCode) {
      provinceComponent.setValue(addressData.provinceCode);
    }
  } catch (error) {
    console.error('Error updating address fields:', error);
  }
}
