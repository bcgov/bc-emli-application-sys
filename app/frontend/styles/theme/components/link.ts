export const Link = {
  baseStyle: {
    color: "text.primary",
    textDecoration: "underline",

    ["svg"]: {
      display: "inline",
      marginLeft: "1",
      marginRight: "1",
    },

    _hover: {
      color: "text.link",
    },
  },
  variants: {
    primaryInverse: {
      color: "white",
      textDecoration: "underline",
      _hover: {
        color: "theme.white",
        opacity: 0.8,
      },
    },
  },
}
