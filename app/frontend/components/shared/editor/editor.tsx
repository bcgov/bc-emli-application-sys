import debounce from 'lodash/debounce';
import { observer } from 'mobx-react-lite';
import Quill from 'quill';
import React, { useEffect, useMemo, useRef } from 'react';
// importing Quill CSS directly from NPM package doesn't work with Vite
// instead, we import from this CSS file which imports the CSS from the CDN URL
// this URL is specific to the current quill versions and should be updated accordingly
import { isQuillEmpty } from '../../../utils/utility-functions';
import { CustomImageBlot } from './custom-extensions/image-blot';
import { CustomLinkBlot } from './custom-extensions/link-blot';
import ImageUploader from './custom-extensions/quill-image-uploader/imageUploader.js';
import './quill.css';

Quill.register(CustomImageBlot);
Quill.register(CustomLinkBlot);
Quill.register('modules/imageUploader', ImageUploader);

// from https://stackoverflow.com/questions/11300906/check-if-a-string-starts-with-http-using-javascript
export const getValidUrl = (url = '') => {
  let newUrl = window.decodeURIComponent(url);
  newUrl = newUrl?.trim()?.replace(/\s/g, '');

  if (/^(:\/\/)/.test(newUrl)) {
    return `https${newUrl}`;
  }
  if (!/^(f|ht)tps?:\/\//i.test(newUrl)) {
    return `https://${newUrl}`;
  }

  return newUrl;
};

type TToolbarItemName =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strike'
  | 'header'
  | 'blockquote'
  | 'code-block'
  | 'link'
  | 'image'
  | 'list';

export interface IEditorProps {
  richText?: boolean;
  readonly?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  onChange?: (htmlValue: string) => void;
  htmlValue?: string;
  value?: string;
  modules?: Record<string, unknown>;
  className?: string;
  id?: string;
  style?: React.CSSProperties;
  autoFocus?: boolean;
  shouldContainRichTextToolbarItem?: (
    item: TToolbarItemName | string | { [key: TToolbarItemName | string]: any },
  ) => boolean;
}

export const Editor = observer(
  ({
    richText = true,
    readonly,
    readOnly,
    placeholder,
    onChange,
    htmlValue = '',
    value,
    modules: modulesOverride,
    className,
    id,
    style,
    autoFocus = false,
    shouldContainRichTextToolbarItem = () => true,
  }: IEditorProps) => {
    const editorRef = useRef<Quill | null>(null);
    const editorContainerRef = useRef<HTMLDivElement | null>(null);
    const wasReadOnlyRef = useRef<boolean>(false);
    const isFirstRenderRef = useRef<boolean>(true);
    const initialHtml = value ?? htmlValue ?? '';
    const isReadOnly = readOnly ?? readonly ?? false;

    const handleChange = useMemo(
      () =>
        debounce((content: string) => {
          onChange?.(isQuillEmpty(content) ? '' : content);
        }, 500),
      [onChange],
    );

    // This modules cannot be reactive
    // using use memo so that values don't change after initial render
    const defaultModules = useMemo(
      () => ({
        toolbar: richText
          ? {
              container: [
                ['bold', 'italic', 'underline', { list: 'bullet' }, { list: 'ordered' }, 'link'], // TODO: image neeeds to be added when object storage is implemented
              ]
                .map((toolbarRow) => toolbarRow.filter((item) => shouldContainRichTextToolbarItem(item)))
                .filter((toolbarRow) => toolbarRow.length > 0),
              handlers: {
                link: function (value) {
                  const href = prompt('Enter the URL of the link:');
                  if (value && href) {
                    const validUrl = getValidUrl(href);
                    const editor = this?.quill;
                    const selectionRange = editor?.getSelection();
                    if (selectionRange?.length === 0) {
                      editor?.insertText(editor?.getSelection()?.index, href, 'link', { href: validUrl });
                    } else {
                      this.quill.format('link', { href: validUrl });
                    }
                  } else {
                    this.quill.format('link', false);
                  }
                },
              },
            }
          : false, // removes toolbar when rich text is not enabled
        // TODO: implement image uploader when object storage is ready
        // ...(richText
        //   ? {
        //       imageUploader: {
        //         upload: (file) => {
        //           return new Promise((resolve, reject) => {
        //             environment.api.getPresignedUrlForEditorAssets(file.name, file.type).then((res) => {
        //               const uploadFailureToastOptions: UseToastOptions = {
        //                 title: "Image upload failed",
        //                 description: "Please try again later.",
        //                 status: "error",
        //                 duration: 2000,
        //                 isClosable: true,
        //                 position: "bottom-right",
        //               }
        //
        //               const rejectionMessage = "Image upload failed. Something went wrong"
        //
        //               if (res.ok) {
        //                 const { url: presignedUploadUrl, method, s3FileUrlAfterUpload } = res.data.data
        //
        //                 const myHeaders = new Headers({ "Content-Type": file.type })
        //
        //                 fetch(presignedUploadUrl, {
        //                   method,
        //                   headers: myHeaders,
        //                   body: file,
        //                 })
        //                   .then((response) => {
        //                     if (response.status >= 200 && response.status < 300) {
        //                       resolve(s3FileUrlAfterUpload)
        //                     } else {
        //                       toast(uploadFailureToastOptions)
        //                       reject(rejectionMessage)
        //                     }
        //                   })
        //                   .catch((e) => {
        //                     toast(uploadFailureToastOptions)
        //                     reject(e)
        //                   })
        //               } else {
        //                 toast(uploadFailureToastOptions)
        //
        //                 reject(rejectionMessage)
        //               }
        //             })
        //           })
        //         },
        //       },
        //     }
        //   : {}),
      }),
      [richText, shouldContainRichTextToolbarItem],
    );

    const modules = useMemo(() => {
      if (!modulesOverride) {
        return defaultModules;
      }

      return {
        ...defaultModules,
        ...modulesOverride,
      };
    }, [defaultModules, modulesOverride]);

    useEffect(() => {
      const container = editorContainerRef.current;
      if (!container || editorRef.current) {
        return;
      }
      if (!isFirstRenderRef.current) {
        return;
      }
      isFirstRenderRef.current = false;
      const editorNode = container.ownerDocument.createElement('div');
      container.appendChild(editorNode);

      const quill = new Quill(editorNode, {
        theme: !isReadOnly && richText ? 'snow' : 'bubble',
        modules,
        readOnly: isReadOnly,
        placeholder,
      });

      editorRef.current = quill;

      if (initialHtml) {
        quill.clipboard.dangerouslyPasteHTML(initialHtml);
      }

      const onTextChange = (_delta: unknown, _oldDelta: unknown, source: string) => {
        if (source !== 'user') {
          return;
        }

        handleChange(quill.root.innerHTML);
      };

      quill.on('text-change', onTextChange);

      if (autoFocus) {
        quill.focus();
      }

      // Track initial read-only state
      wasReadOnlyRef.current = isReadOnly;

      return () => {
        handleChange.cancel();
        quill.off('text-change', onTextChange);
        editorRef.current = null;
        container.innerHTML = '';
      };
    }, []);

    useEffect(() => {
      return () => {
        handleChange.cancel();
      };
    }, [handleChange]);

    useEffect(() => {
      const quill = editorRef.current;
      if (!quill) {
        return;
      }

      quill.enable(!isReadOnly);
    }, [isReadOnly]);

    useEffect(() => {
      const quill = editorRef.current;
      if (!quill || isReadOnly) {
        return;
      }

      // Only sync when transitioning from read-only to edit mode
      // This allows EditorWithPreview to sync content when switching modes
      const justSwitchedToEdit = wasReadOnlyRef.current === true;

      if (!justSwitchedToEdit) {
        return;
      }

      const nextHtml = htmlValue ?? '';
      const currentHtml = quill.root.innerHTML;

      if (nextHtml && nextHtml !== currentHtml) {
        quill.clipboard.dangerouslyPasteHTML(nextHtml);
      }
    }, [isReadOnly]);

    // Track mode transitions
    useEffect(() => {
      wasReadOnlyRef.current = isReadOnly;
    }, [isReadOnly]);

    // Separate effect for read-only mode syncing
    useEffect(() => {
      const quill = editorRef.current;
      if (!quill || !isReadOnly) {
        return;
      }

      const nextHtml = htmlValue ?? '';
      const currentHtml = quill.root.innerHTML;

      if (nextHtml && nextHtml !== currentHtml) {
        quill.clipboard.dangerouslyPasteHTML(nextHtml);
      }
    }, [htmlValue, isReadOnly]);
    // Sync external HTML changes (non-destructive)
    useEffect(() => {
      const quill = editorRef.current;
      if (!quill) {
        return;
      }

      const nextHtml = htmlValue ?? '';
      const currentHtml = quill.root.innerHTML;

      // Only sync in read-only mode or when content is empty
      // In edit mode with content, user owns the state
      if (!isReadOnly && currentHtml !== '' && isQuillEmpty(currentHtml) === false) {
        return;
      }

      if (nextHtml && nextHtml !== currentHtml) {
        quill.clipboard.dangerouslyPasteHTML(nextHtml);
      }
    }, [htmlValue, isReadOnly]);

    const containerClassName = ['quill', className].filter(Boolean).join(' ');

    return <div id={id} className={containerClassName} style={style} ref={editorContainerRef} />;
  },
);
