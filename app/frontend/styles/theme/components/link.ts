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

    _visited: {
      color: "text.link",
    },
  },
  variants: {
    primaryInverse: {
      color: "white",
      _hover: {
        color: "theme.white",
        opacity: 0.8,
      },
    },
  },
}
