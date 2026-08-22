/* tslint:disable */
import { Components } from 'formiojs';
import { FILE_UPLOAD_FILE_PATTERN } from '../../../additional-formio/constant';
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
        filePattern: FILE_UPLOAD_FILE_PATTERN,
        fileMinSize: '0KB',
        fileMaxSize: '100MB',
        uploadOnly: false,
        customClass: 'formio-component-file',
      },
      ...extend,
    );
  }
  // Form.io v5's File hardcodes `get defaultSchema() { return FileComponent.schema(); }` -
  // the PARENT class, not `this.constructor`. Component#mergeSchema builds each instance from
  // defaultSchema, so without this override our static schema() is never consulted and every
  // instance silently falls back to the parent's defaults (notably filePattern: '*').
  get defaultSchema() {
    return this.constructor.schema();
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
  interpolateErrors(errors) {
    const interpolated = super.interpolateErrors(errors);
    // An empty required file field produces TWO errors saying the same thing: `required`, and
    // `array_nonempty` from core's validateMultiple - which only fires because every file
    // component is forced to multiple: true (formio-component-traversal.ts). The second renders
    // as "<label> must be a non-empty array", which is developer-facing. Drop it when the plain
    // required message is already being shown.
    return interpolated.some((e) => e.ruleName === 'required')
      ? interpolated.filter((e) => e.ruleName !== 'array_nonempty')
      : interpolated;
  }

  handleFilesToUpload(files) {
    // Client-side rejections render without a dismiss control (nothing was uploaded, so there
    // is nothing to remove). Clear stale ones whenever the user tries again, otherwise they
    // accumulate with no way to get rid of them.
    this.filesToSync.filesToUpload = this.filesToSync.filesToUpload.filter((f) => !f.isValidationError);
    return super.handleFilesToUpload(files);
  }

  prepareFileToDelete(fileInfo) {
    // Form.io v5 locates the row to remove with `file.name === fileInfo.name`. Our file
    // objects carry no `name` - the name lives in `filename` / `originalName` - so every
    // comparison was `undefined === undefined`, findIndex always returned 0, and clicking
    // any file's remove control deleted the FIRST file instead. Match on `id`, which is
    // unique and present on every entry. (v4 used the clicked index and was correct.)
    //
    // A missing id yields -1, which Component.splice() ignores via hasOwnProperty, so the
    // failure mode is "nothing removed" rather than "wrong file removed".
    this.filesToSync.filesToDelete.push({
      ...fileInfo,
      status: 'info',
      message: this.t(this.autoSync ? 'readyForRemovingFromStorage' : 'preparingFileToRemove'),
    });
    this.splice(this.dataValue.findIndex((file) => file.id === fileInfo.id));
    this.redraw();
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
