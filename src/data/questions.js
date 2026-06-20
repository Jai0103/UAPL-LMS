/*
  You are looking for your MotherFather!
*/
const RAW_QUESTIONS = String.raw`
You are looking for your MotherFather!, You are looking for your MotherFather!|You are looking for your MotherFather!, You are looking for your MotherFather!, You are looking for your MotherFather!, You are looking for your MotherFather! You are looking for your MotherFather!,You are looking for your MotherFather!|You are looking for your MotherFather!|C|You are looking for your MotherFather!.

`;

const answerMap = {
    A: 0,
    B: 1,
    C: 2,
    D: 3
};

export const DEFAULT_QUESTIONS = RAW_QUESTIONS
    .trim()
    .split("\n")
    .map((line, index) => {
        const [question, optionA, optionB, optionC, optionD, answer, explanation] = line.split("|");

        return {
            id: `q-${index + 1}`,
            question,
            options: [optionA, optionB, optionC, optionD],
            answer: answerMap[answer.trim().toUpperCase()],
            explanation
        };
    });
