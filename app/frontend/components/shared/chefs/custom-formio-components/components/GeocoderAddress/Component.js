/* tslint:disable */
import { Components } from 'formiojs';
import editForm from './Component.form.js';

const ParentComponent = Components.components.select;
const ID = 'geocoderaddress';
const DISPLAY = 'BC Address (Searchable)';

export default class Component extends ParentComponent {
  static schema(...extend) {
    return ParentComponent.schema(
      {
        type: ID,
        label: DISPLAY,
        key: ID,
        dataSrc: 'json',
        dataType: 'auto',
        data: {
          json: [],
        },
        valueProperty: 'value',
        searchField: 'label',
        template: '<span>{{ item.label }}</span>',
        filter: 'address',
        searchEnabled: true,
        minSearch: 3,
        widget: 'choicesjs',
      },
      ...extend,
    );
  }

  static editForm = editForm;

  static get builderInfo() {
    return {
      title: DISPLAY,
      group: 'basic',
      icon: 'map-marker',
      weight: 40,
      schema: Component.schema(),
    };
  }

  attach(element) {
    const result = super.attach(element);

    console.log('GeocoderAddress component attached, key:', this.key);

    // Track last search term to avoid duplicate searches
    let lastSearchTerm = '';
    let searchTimeout = null;

    // Wait for choices to be fully initialized, then set up search listener
    if (this.choices) {
      // Find the actual search input element created by Choices.js
      const searchInput =
        this.element?.querySelector('.choices__input--cloned') ||
        this.element?.querySelector('input[type="search"]') ||
        this.element?.querySelector('input[type="text"]');

      if (searchInput) {
        console.log('Found choices search input');

        searchInput.addEventListener('input', (e) => {
          const searchTerm = e.target.value;

          // Skip if search term hasn't changed
          if (searchTerm === lastSearchTerm) {
            return;
          }

          console.log('Geocoder search input changed:', searchTerm);

          // Clear existing timeout
          if (searchTimeout) {
            clearTimeout(searchTimeout);
          }

          if (searchTerm.length >= 3) {
            // Debounce search by 800ms
            searchTimeout = setTimeout(() => {
              lastSearchTerm = searchTerm;
              document.dispatchEvent(
                new CustomEvent('searchGeocoderAddress', {
                  detail: {
                    searchTerm: searchTerm,
                    searchKey: this.key,
                    parentKey: this.key.substring(0, this.key.lastIndexOf('|')),
                  },
                }),
              );
            }, 800);
          }
        });
      } else {
        console.warn('Could not find choices search input element');
      }
    }

    return result;
  }

  setValue(value) {
    console.log('GeocoderAddress setValue called with:', value);
    super.setValue(value);

    // Dispatch event when value is selected
    if (value) {
      const parentKey = this.key.substring(0, this.key.lastIndexOf('|'));
      console.log('Dispatching geocoderAddressSelected for value:', value);

      document.dispatchEvent(
        new CustomEvent('geocoderAddressSelected', {
          detail: {
            value: value,
            parentKey: parentKey,
          },
        }),
      );
    }
  }
}
