import { Box, BoxProps } from '@chakra-ui/react';
import React from 'react';

interface IEulaContentProps extends Omit<BoxProps, 'children' | 'dangerouslySetInnerHTML'> {
  content: string;
}

/**
 * Renders EULA content authored in `eulas/*.html`.
 *
 * The content is written by developers as files, seeded into the database by EulaUpdater, and
 * sanitized server-side by EndUserLicenseAgreement (`sanitizable :content`) before it is ever
 * stored - so it is trusted here. It is deliberately NOT rendered through the shared Quill
 * `Editor`: Quill reparses HTML into its own model and silently drops anything it has no format
 * for, which means the authored markup and the rendered markup diverge. Every EULA view uses
 * this component so they stay in step.
 *
 * Styling hooks for content authors: the sanitizer allows `class` but strips `style`, so any
 * presentation must be a class styled here rather than an inline style in the HTML file.
 */
export const EulaContent = ({ content, sx, ...boxProps }: IEulaContentProps) => (
  <Box
    dangerouslySetInnerHTML={{ __html: content }}
    sx={{
      fontFamily: 'BC Sans',
      fontSize: '16px',
      lineHeight: '27px',
      color: '#2D2D2D',
      '& p': { marginBottom: '1rem' },
      // 2.5rem is the browser default indent for a list; Chakra's reset zeroes it, so set it back
      '& ul, & ol': { marginBottom: '1rem', paddingLeft: '2.5rem' },
      // nested lists indent a further step and tuck under their parent item
      '& ul ul, & ul ol, & ol ul, & ol ol': { marginTop: '0.5rem', marginBottom: 0 },
      '& li': { marginBottom: '0.5rem' },
      // authoring hook: `class="eula-indent"` steps a block in, e.g. a lead-in line that
      // introduces the list below it. The sanitizer strips `style` but allows `class`, so
      // presentation in eulas/*.html has to go through named classes like this one.
      '& .eula-indent': { paddingLeft: '1.25rem' },
      '& b, & strong': { fontWeight: '700' },
      '& i, & em': { fontStyle: 'italic' },
      '& a': {
        color: '#005C97',
        textDecoration: 'underline',
        '&:hover': { color: '#003f68' },
      },
      '& h1, & h2, & h3': {
        fontFamily: 'BC Sans',
        fontWeight: '700',
        color: '#005C97',
        marginBottom: '1rem',
        marginTop: '1.5rem',
      },
      ...sx,
    }}
    {...boxProps}
  />
);
