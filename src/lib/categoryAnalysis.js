export const TRAINING_CATEGORIES = [
    "General UAS Knowledge",
    "Principles of Flight",
    "Air Law",
    "Navigation and Meteorology",
    "Human Factors",
    "Safety and Operations"
];

export function normalizeCategory(category) {
    if (TRAINING_CATEGORIES.includes(category)) return category;
    return "General UAS Knowledge";
}

export function buildCategoryBreakdown(questions, userAnswers) {
    const breakdown = {};

    TRAINING_CATEGORIES.forEach(category => {
        breakdown[category] = {
            category,
            correct: 0,
            total: 0,
            accuracy: 0
        };
    });

    questions.forEach((question, index) => {
        const category = normalizeCategory(question.category);
        const userAnswer = userAnswers[index];

        breakdown[category].total += 1;

        if (userAnswer === question.answer) {
            breakdown[category].correct += 1;
        }
    });

    return Object.values(breakdown).map(item => ({
        ...item,
        accuracy: item.total ? Math.round((item.correct / item.total) * 100) : 0
    }));
}

export function getStrongAndWeakCategories(categoryBreakdown) {
    const activeCategories = categoryBreakdown.filter(item => item.total > 0);

    if (!activeCategories.length) {
        return {
            strongest: null,
            weakest: null
        };
    }

    const sorted = [...activeCategories].sort((a, b) => b.accuracy - a.accuracy);

    return {
        strongest: sorted[0],
        weakest: sorted[sorted.length - 1]
    };
}
