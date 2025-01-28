import { colors } from "../foundations/colors"
export const Radio = {
  baseStyle: {
    control: {
      _checked: {
        bg: "theme.darkBlue",
        borderWidth: "0",
      },

      _focus: {
        outline: `3px solid ${colors.theme.radioOutline}`,
        outlineOffset: "2px",
        boxShadow: "none",
      },
    },
  },
}
