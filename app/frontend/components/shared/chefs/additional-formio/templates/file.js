// Override for the formio bootstrap file template.
//
// The original template embeds ctx.component.description (which is raw HTML) directly
// into a <span class="sr-only"> that lives inside an <a> tag.  When the description
// contains block-level elements such as <ul>/<li> the browser's HTML parser
// considers the nesting invalid and hoists those elements outside every inline
// ancestor, making them fully visible even though they should be hidden.
//
// Fix: strip all HTML tags from the description before putting it into the sr-only
// span so the text remains purely inline.

function stripHtml(html) {
  if (!html) return '';
  // Use the DOM when available (browser), otherwise fall back to a simple regex.
  if (typeof document !== 'undefined') {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }
  return html.replace(/<[^>]*>/g, '');
}

export const overrideFileTemplate = (ctx) => {
  var __t,
    __p = '',
    __j = Array.prototype.join;
  const files = Array.isArray(ctx?.files) ? ctx.files : [];
  // v5 removed `statuses`; the equivalent queue is filesToUpload (File.js render()).
  const filesToUpload = Array.isArray(ctx?.filesToUpload) ? ctx.filesToUpload : [];
  const fileTypes = Array.isArray(ctx?.component?.fileTypes) ? ctx.component.fileTypes : [];
  function print() {
    __p += __j.call(arguments, '');
  }

  if (ctx.options.vpat) {
    __p +=
      '\n  <span tabindex="-1" class="sr-only" id="invisible-' +
      ((__t = ctx.instance.id) == null ? '' : __t) +
      '-' +
      ((__t = ctx.component.key) == null ? '' : __t) +
      '"></span>\n';
  }
  __p += '\n';
  if (!ctx.self.imageUpload) {
    __p += '\n  ';
    if (ctx.options.vpat) {
      __p +=
        '\n    <div>' +
        ((__t =
          !ctx.component.filePattern || ctx.component.filePattern === '*'
            ? 'Any file types are allowed'
            : ctx.t('Allowed file types: ') + ctx.component.filePattern) == null
          ? ''
          : __t) +
        '</div>\n  ';
    }
    __p +=
      '\n  <ul class="list-group list-group-striped">\n    <li class="list-group-item list-group-header hidden-xs hidden-sm">\n      <div class="row">\n        ';
    if (!ctx.disabled) {
      __p += '\n          <div class="col-md-1"></div>\n        ';
    }
    __p += '\n        <div class="col-md-';
    if (ctx.self.hasTypes) {
      __p += '7';
    } else {
      __p += '9';
    }
    __p +=
      '"><strong>' +
      ((__t = ctx.t('File Name')) == null ? '' : __t) +
      '</strong></div>\n        <div class="col-md-2"><strong>' +
      ((__t = ctx.t('Size')) == null ? '' : __t) +
      '</strong></div>\n        ';
    if (ctx.self.hasTypes) {
      __p +=
        '\n          <div class="col-md-2"><strong>' +
        ((__t = ctx.t('Type')) == null ? '' : __t) +
        '</strong></div>\n        ';
    }
    __p += '\n      </div>\n    </li>\n    ';
    files.forEach(function (file) {
      __p += '\n      <li class="list-group-item">\n        <div class="row">\n          ';
      if (!ctx.disabled) {
        __p +=
          '\n            <div class="col-md-1"><button type="button" class="' +
          ((__t = ctx.iconClass('remove')) == null ? '' : __t) +
          '" ref="removeLink"><span class="sr-only">' +
          ((__t = ctx.t('Remove ') + (file.originalName || file.name)) == null ? '' : __t) +
          '</span></button></div>\n          ';
      }
      __p += '\n          <div class="col-md-';
      if (ctx.self.hasTypes) {
        __p += '7';
      } else {
        __p += '9';
      }
      __p += '">\n            ';
      if (ctx.component.uploadOnly) {
        __p += '\n              ' + ((__t = file.originalName || file.name) == null ? '' : __t) + '\n            ';
      } else {
        __p +=
          '\n              <a href="' +
          ((__t = file.url || '#') == null ? '' : __t) +
          '" target="_blank" ref="fileLink">\n                <span class="sr-only">' +
          ((__t = ctx.t('Press to open ')) == null ? '' : __t) +
          '</span>' +
          ((__t = file.originalName || file.name) == null ? '' : __t) +
          '\n              </a>\n            ';
      }
      __p +=
        '\n          </div>\n          <div class="col-md-2">' +
        ((__t = ctx.fileSize(file.size)) == null ? '' : __t) +
        '</div>\n          ';
      if (ctx.self.hasTypes && !ctx.disabled) {
        __p +=
          '\n            <div class="col-md-2">\n              <select class="file-type" ref="fileType">\n                ';
        fileTypes.map(function (type) {
          __p += '\n                  <option class="test" value="' + ((__t = type.value) == null ? '' : __t) + '" ';
          if (type.label === file.fileType) {
            __p += 'selected="selected"';
          }
          __p += '>' + ((__t = ctx.t(type.label)) == null ? '' : __t) + '</option>\n                ';
        });
        __p += '\n              </select>\n            </div>\n          ';
      }
      if (ctx.self.hasTypes && ctx.disabled) {
        __p += '\n          <div class="col-md-2">' + ((__t = file.fileType) == null ? '' : __t) + '</div>\n          ';
      }
      __p += '\n        </div>\n      </li>\n    ';
    });
    __p += '\n  </ul>\n';
  } else {
    __p += '\n  <div>\n    ';
    files.forEach(function (file) {
      __p +=
        '\n      <div>\n        <span>\n          <img ref="fileImage" src="" alt="' +
        ((__t = file.originalName || file.name) == null ? '' : __t) +
        '" style="width:' +
        ((__t = ctx.component.imageSize) == null ? '' : __t) +
        'px">\n          ';
      if (!ctx.disabled) {
        __p +=
          '\n            <button type="button" class="' +
          ((__t = ctx.iconClass('remove')) == null ? '' : __t) +
          '" ref="removeLink"><span class="sr-only">' +
          ((__t = ctx.t('Remove ') + (file.originalName || file.name)) == null ? '' : __t) +
          '</span></button>\n          ';
      }
      __p += '\n        </span>\n      </div>\n    ';
    });
    __p += '\n  </div>\n';
  }
  __p += '\n';
  if (!ctx.disabled && (ctx.component.multiple || !files.length)) {
    __p += '\n  ';
    if (ctx.self.useWebViewCamera) {
      __p +=
        '\n    <div class="fileSelector">\n      <button class="btn btn-primary" ref="galleryButton"><i class="fa fa-book"></i> ' +
        ((__t = ctx.t('Gallery')) == null ? '' : __t) +
        '</button>\n      <button class="btn btn-primary" ref="cameraButton"><i class="fa fa-camera"></i> ' +
        ((__t = ctx.t('Camera')) == null ? '' : __t) +
        '</button>\n    </div>\n  ';
    } else if (!ctx.self.cameraMode) {
      __p +=
        '\n    <div class="fileSelector" ref="fileDrop" ' +
        ((__t = ctx.fileDropHidden ? 'hidden' : '') == null ? '' : __t) +
        '>\n      <i class="' +
        ((__t = ctx.iconClass('cloud-upload')) == null ? '' : __t) +
        '"></i> ' +
        ((__t = ctx.t('Drop files to attach,')) == null ? '' : __t) +
        '\n        ';
      if (ctx.self.imageUpload && ctx.component.webcam) {
        __p +=
          '\n          <a href="#" ref="toggleCameraMode"><i class="fa fa-camera"></i> ' +
          ((__t = ctx.t('use camera')) == null ? '' : __t) +
          '</a>\n        ';
      }
      // --- KEY FIX: strip HTML from description before embedding in sr-only span ---
      const plainDescription = stripHtml(ctx.component.description);
      // The allowed-types list is rendered visibly under the drop zone (.file-pattern-hint), so
      // it is announced from there. Repeating it here made screen readers say it twice. Only
      // mention it when there is no visible hint, i.e. when the pattern is unrestricted.
      const hasPatternHint = !!(ctx.component.filePattern && ctx.component.filePattern !== '*');
      // The visible hint is a sibling of the browse link, so it is not part of that link's
      // accessible name. Point at it with aria-describedby so assistive tech announces the
      // allowed types on focus, without duplicating the text into the name itself.
      const hintId = 'file-pattern-hint-' + ctx.instance.id;
      const filePatternText = hasPatternHint ? '' : 'Any file types are allowed';
      const srOnlyText = ctx.t(
        'Browse to attach file for ' +
          ctx.component.label +
          '. ' +
          (plainDescription ? plainDescription + '. ' : '') +
          filePatternText,
      );

      __p +=
        '\n        ' +
        ((__t = ctx.t('or')) == null ? '' : __t) +
        '\n        <a href="#" ref="fileBrowse" class="browse"' +
        (hasPatternHint ? ' aria-describedby="' + hintId + '"' : '') +
        '>\n          ' +
        ((__t = ctx.t('browse')) == null ? '' : __t) +
        '\n          <span class="sr-only">\n            ' +
        ((__t = srOnlyText) == null ? '' : __t) +
        '\n          </span>\n        </a>\n      <div ref="fileProcessingLoader" class="loader-wrapper">\n        <div class="loader text-center"></div>\n      </div>\n    </div>\n  ';

      // Allowed formats, visible. Previously this only existed inside the sr-only span above
      // (and in a `ctx.options.vpat`-gated div that is never enabled), so sighted users were
      // never told what the field accepts - the single biggest cause of failed uploads.
      if (hasPatternHint) {
        __p +=
          '\n      <div class="file-pattern-hint" id="' +
          hintId +
          '">' +
          ((__t = ctx.t('Allowed file types: ') + ctx.component.filePattern.split(',').join(', ')) == null ? '' : __t) +
          '</div>';
      }
    } else {
      __p +=
        '\n    <div class="video-container">\n      <video class="video" autoplay="true" ref="videoPlayer" tabindex="-1"></video>\n    </div>\n    <button class="btn btn-primary" ref="takePictureButton"><i class="fa fa-camera"></i> ' +
        ((__t = ctx.t('Take Picture')) == null ? '' : __t) +
        '</button>\n    <button class="btn btn-primary" ref="toggleCameraMode">' +
        ((__t = ctx.t('Switch to file upload')) == null ? '' : __t) +
        '</button>\n  ';
    }
    __p += '\n';
  }
  __p += '\n';
  // INVARIANT: every entry in filesToUpload must render exactly one [ref="fileToSyncRemove"].
  // Formio binds these controls by their position in the refs array and splices
  // filesToUpload at that same index (File.js:394), so a row that renders no control shifts
  // every later row's target and dismisses the wrong entry. Rows that must not offer the
  // control render a hidden placeholder rather than omitting it.
  filesToUpload.forEach(function (status) {
    // A client-side rejection (wrong type, too big, duplicate name) never left the browser -
    // nothing was scanned, uploaded or attached. So it renders as a plain message, with no
    // remove control and no file size: there is nothing to remove and nothing was measured.
    // These are cleared automatically the next time the user picks a file.
    if (status.isValidationError) {
      const why = String(status.message || '').replace(/^File /, '');
      __p +=
        '\n  <div class="file-rejected alert alert-danger" role="alert">' +
        ((__t = status.originalName || status.name) == null ? '' : __t) +
        ' ' +
        ((__t = ctx.t(why)) == null ? '' : __t) +
        '<button type="button" ref="fileToSyncRemove" hidden></button></div>\n';
      return;
    }

    // Anything else got as far as the network - it may have reached storage - so it keeps the
    // dismissible row.
    __p +=
      '\n  <div class="file ' +
      ((__t = status.status === 'error' ? ' has-error' : '') == null ? '' : __t) +
      '">\n    <div class="row">\n      <div class="fileName col-sm-10">' +
      ((__t = status.originalName) == null ? '' : __t);
    // A row is dismissible only once it has failed AND the whole sync has settled.
    //
    // Dismissing before then does not stick: when syncFiles() finishes it rebuilds
    // filesToSync.filesToUpload from the batch result (File.js:1041), so a row spliced out
    // mid-sync simply reappears. Measured - splicing an entry at t=2000ms of a 5s upload had
    // no lasting effect either way. A control that silently undoes itself is worse than no
    // control, so nothing is offered until the queue is stable.
    //
    // Both halves of the test matter:
    //   status === 'error' - a file spends nearly all its in-flight life at 'info'
    //     (waitFileProcessing), covering the virus scan and the S3 PUT. 'progress' appears only
    //     at the very end, because our provider reports progress once at 100% after the PUT
    //     returns (uploads.ts:33). Keying on 'progress' leaves the control live almost the
    //     whole time.
    //   !ctx.isSyncing - upload() is a Promise.all (File.js:960), so one file can fail and
    //     redraw its row while its siblings are still uploading. Measured at 5.25s for a 60kB
    //     sibling on a throttled connection. syncFiles' finally block clears isSyncing and
    //     redraws, which is what exposes the buttons.
    //
    // Formio's stock template offers an abort button here instead, but our provider never
    // calls abortCallback (s3custom.js:26) and uploadFileOneChunk uses fetch with no
    // AbortSignal, so it would do nothing.
    if (status.status !== 'error' || ctx.isSyncing) {
      __p += '\n        <button type="button" ref="fileToSyncRemove" hidden></button>';
    } else {
      __p +=
        '\n        <button type="button" class="' +
        ((__t = ctx.iconClass('remove')) == null ? '' : __t) +
        '" ref="fileToSyncRemove"><span class="sr-only">' +
        ((__t = ctx.t('Dismiss message about ' + (status.originalName || status.name) + '.')) == null ? '' : __t) +
        '</span></button>';
    }
    __p +=
      '\n      </div>\n      <div class="fileSize col-sm-2 text-right">' +
      ((__t = ctx.fileSize(status.size)) == null ? '' : __t) +
      '</div>\n    </div>\n    <div class="row">\n      <div class="col-sm-12">\n        ';
    if (status.status === 'progress') {
      __p +=
        '\n          <div class="progress">\n            <div class="progress-bar" role="progressbar" ref="progress" id="' +
        ((__t = status.id) == null ? '' : __t) +
        '" aria-valuenow="' +
        ((__t = status.progress) == null ? '' : __t) +
        '" aria-valuemin="0" aria-valuemax="100" style="width: ' +
        ((__t = status.progress) == null ? '' : __t) +
        '%">\n              <span class="sr-only">' +
        ((__t = status.progress) == null ? '' : __t) +
        '% ' +
        ((__t = ctx.t('Complete')) == null ? '' : __t) +
        '</span>\n            </div>\n          </div>\n        ';
    } else if (status.status === 'error') {
      __p +=
        '\n          <div class="alert alert-danger" role="alert">' +
        ((__t = ctx.t(status.message)) == null ? '' : __t) +
        '</div>\n        ';
    } else {
      __p += '\n          <div>' + ((__t = ctx.t(status.message)) == null ? '' : __t) + '</div>\n        ';
    }
    __p += '\n      </div>\n    </div>\n  </div>\n';
  });
  __p += '\n';
  if (!ctx.component.storage || ctx.support.hasWarning) {
    __p += '\n  <div class="alert alert-warning">\n    ';
    if (!ctx.component.storage) {
      __p +=
        '\n      <p>' +
        ((__t = ctx.t('No storage has been set for this field. File uploads are disabled until storage is set up.')) ==
        null
          ? ''
          : __t) +
        '</p>\n    ';
    }
    __p += '\n    ';
    if (!ctx.support.filereader) {
      __p +=
        '\n      <p>' + ((__t = ctx.t('File API & FileReader API not supported.')) == null ? '' : __t) + '</p>\n    ';
    }
    __p += '\n    ';
    if (!ctx.support.formdata) {
      __p += '\n      <p>' + ((__t = ctx.t("XHR2's FormData is not supported.")) == null ? '' : __t) + '</p>\n    ';
    }
    __p += '\n    ';
    if (!ctx.support.progress) {
      __p +=
        '\n      <p>' + ((__t = ctx.t("XHR2's upload progress isn't supported.")) == null ? '' : __t) + '</p>\n    ';
    }
    __p += '\n  </div>\n';
  }
  __p += '\n';
  return __p;
};
