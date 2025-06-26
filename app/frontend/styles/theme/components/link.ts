export const Link = {
  baseStyle: {
    color: 'text.primary',
    textDecoration: 'underline',
    textUnderlineOffset: '4px',

    ['svg']: {
      display: 'inline',
      marginLeft: '1',
      marginRight: '1',
    },

    _hover: {
      color: 'text.link',
    },

    _visited: {
      color: 'text.link',
    },
  },
  variants: {
    primaryInverse: {
      color: 'white',
      textDecoration: 'underline',
      textUnderlineOffset: '4px',
      _visited: {
        color: 'white',
      },
      _hover: {
        color: 'theme.white',
        opacity: 0.6,
      },
    },
  },
};
