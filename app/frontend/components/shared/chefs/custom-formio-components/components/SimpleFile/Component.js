/* tslint:disable */
import { Components } from 'formiojs';
import { Constants } from '../Common/Constants.js';
import editForm from './Component.form.js';
const ParentComponent = Components.components.file;
const ID = 'simplefile';
const DISPLAY = 'File Upload';
export default class Component extends ParentComponent {
  static schema(...extend) {
    return ParentComponent.schema(
      {
        type: ID,
        label: DISPLAY,
        key: ID,
        storage: 's3custom', //REMOVED THE DEFAULT CHEFS STORAGE AS THERE IS NO SUCH TYPE HERE
        url: '/files',
        fileKey: 'files',
        fileNameTemplate: '{{fileName}}',
        image: false,
        webcam: false,
        webcamSize: 320,
        privateDownload: false,
        imageSize: '200',
        filePattern: '*',
        fileMinSize: '0KB',
        fileMaxSize: '100MB',
        uploadOnly: false,
        customClass: 'formio-component-file',
      },
      ...extend,
    );
  }
  static editForm = editForm;
  static get builderInfo() {
    return {
      title: DISPLAY,
      group: 'simple',
      icon: 'file',
      weight: 13,
      documentation: Constants.DEFAULT_HELP_LINK,
      schema: Component.schema(),
    };
  }
  // we will read these in from runtime
  _enabled;
  constructor(...args) {
    super(...args);
    try {
      if (this.options && this.options.componentOptions) {
        // componentOptions are passed in from the viewer, basically runtime configuration
        const opts = this.options.componentOptions[ID];
        this.component.options = { ...this.component.options, ...opts };
        // the config.uploads object will say what size our server can handle and what path to use.
        if (opts.config && opts.config.uploads) {
          const remSlash = (s) => s.replace(/^\s*\/*\s*|\s*\/*\s*$/gm, '');
          const cfg = opts.config;
          const uploads = cfg.uploads;
          this.component.fileMinSize = uploads.fileMinSize;
          this.component.fileMaxSize = uploads.fileMaxSize;
          // set the default url to be for uploads.
          this.component.url = `/${remSlash(cfg.basePath)}/${remSlash(cfg.apiPath)}/${remSlash(uploads.path)}`;
          // no idea what to do with this yet...
          this._enabled = uploads.enabled;
        }
      }
    } catch (e) {}
  }
  deleteFile(fileInfo) {
    const { options = {} } = this.component;
    const Provider = Formio.Providers.getProvider('storage', this.component.storage);
    if (Provider) {
      const provider = new Provider(this);
      if (fileInfo && provider && typeof provider.deleteFile === 'function') {
        provider.deleteFile(fileInfo, options);
      }
    }
  }
  upload(...args) {
    // Formio v5 handles file lifecycle via filesToSync + syncFiles().
    // Delegate to parent upload() so selected files actually trigger network requests.
    return super.upload(...args);
  }
  getFile(fileInfo) {
    const { options = {} } = this.component;
    const { fileService } = this;
    if (!fileService) {
      return alert('File Service not provided');
    }
    fileService.downloadFile(fileInfo, options).catch((response) => {
      // Is alert the best way to do this?
      // User is expecting an immediate notification due to attempting to download a file.
      alert(response);
    });
  }
}
