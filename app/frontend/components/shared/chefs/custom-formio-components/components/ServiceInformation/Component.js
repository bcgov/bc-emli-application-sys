import { Components } from 'formiojs';
import { Constants } from '../Common/Constants.js';

const ParentComponent = Components.components.datagrid;
const ID = 'service_information';
const DISPLAY = 'Service Information';

export default class Component extends ParentComponent {
  static schema(...extend) {
    return ParentComponent.schema(
      {
        label: DISPLAY,
        type: ID,
        key: ID,
      },
      ...extend,
    );
  }

  static get builderInfo() {
    return {
      title: DISPLAY,
      group: 'advanced',
      icon: 'users',
      weight: 70,
      documentation: Constants.DEFAULT_HELP_LINK,
      schema: Component.schema(),
    };
  }
}
