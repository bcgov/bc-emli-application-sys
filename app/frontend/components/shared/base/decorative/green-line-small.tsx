import { Divider, DividerProps } from "@chakra-ui/react"
import React from "react"

interface IGreenLineSmallProps extends DividerProps {}

export const GreenLineSmall = ({ ...rest }: IGreenLineSmallProps) => {
  return <Divider borderWidth={2} w={9} opacity={1} borderColor="theme.green" {...rest} />
}
