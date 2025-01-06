import { Box, Button, Card, CardBody, CardHeader, Radio, RadioGroup, Text, Wrap } from "@chakra-ui/react"
import { ArrowSquareOut } from "@phosphor-icons/react"
import React, { useState } from "react"
import { useTranslation } from "react-i18next"

interface QuestionCardProps {
  question: string
  answers: string[]
  onAnswerSelect: (answer: string) => void
  type?: string
}

const QuestionCard: React.FC<QuestionCardProps> = ({ question, answers, onAnswerSelect, type }) => {
  const [selectedAnswer, setSelectedAnswer] = useState<string>("")
  let content: string = ""
  let additionalContent: string | undefined
  const { t } = useTranslation()

  switch (type) {
    case t("auth.checkEligibility.assesmentText"):
      content = t("auth.checkEligibility.assesmentText")
      break
    case t("auth.checkEligibility.paymentTextPrefix"):
      content = t("auth.checkEligibility.paymentTextPrefix")
      additionalContent = t("auth.checkEligibility.paymentTextSuffix")
      break
    case t("auth.checkEligibility.peopleTextPrefix"):
      content = t("auth.checkEligibility.peopleTextPrefix")
      additionalContent = t("auth.checkEligibility.peopleTextSuffix")
      break
    default:
      content = ""
  }

  const handleAnswerChange = (value: string) => {
    if (value !== selectedAnswer) {
      setSelectedAnswer(value)
      onAnswerSelect(value)
    }
  }
  return (
    <Box width="100%" maxW="100%" mx="auto">
      <Card border="1px" borderColor="border.light" mt={4}>
        <CardHeader>
          <Text fontSize="md" fontWeight="bold">
            {question}
          </Text>
          <Text fontSize="md" mt="2">
            {content}{" "}
            {type === t("auth.checkEligibility.assesmentText") && (
              <Button as="span" variant="link">
                {t("auth.checkEligibility.BCAssessment")}
                <ArrowSquareOut />
              </Button>
            )}
          </Text>
          {additionalContent && (
            <Text fontSize="md" mt="2">
              {additionalContent}
            </Text>
          )}
        </CardHeader>
        <CardBody pt={0}>
          <RadioGroup onChange={handleAnswerChange} value={selectedAnswer}>
            <Wrap spacing={4} justify="flex-start" width="100%">
              {answers.map((answer, index) => (
                <Card
                  key={index}
                  p={4}
                  border="1px"
                  borderColor="border.light"
                  justifyContent="center"
                  width={{ base: "100%", md: "calc(22% - 14px)" }}
                  height={{
                    base: "calc(70px + 1vw)",
                    md: "calc(28px + 2vw)",
                  }}
                >
                  <Radio value={answer}>
                    <Text>{answer}</Text>
                  </Radio>
                </Card>
              ))}
            </Wrap>
          </RadioGroup>
        </CardBody>
      </Card>
    </Box>
  )
}

export default QuestionCard
