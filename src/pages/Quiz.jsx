
import { useMemo, useState } from "react";
import { CheckCircle, Shuffle, TimerReset } from "lucide-react";
import { getQuestions } from "../lib/storage";

function shuffleItems(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

export default function Quiz() {
  const [questions, setQuestions] = useState(getQuestions());
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState(Array(questions.length).fill(null));
  const [selected, setSelected] = useState(null);
  const [finished, setFinished] = useState(false);

  const question = questions[index];
  const score = useMemo(
    () => answers.reduce((total, answer, i) => total + (answer === questions[i]?.answer ? 1 : 0), 0),
    [answers, questions]
  );

  const progress = (answers.filter((item) => item !== null).length / questions.length) * 100;

  function submit() {
    if (selected === null || answers[index] !== null) return;

    const next = [...answers];
    next[index] = selected;
    setAnswers(next);

    setTimeout(() => {
      if (index < questions.length - 1) {
        setIndex(index + 1);
        setSelected(null);
      } else {
        setFinished(true);
      }
    }, 250);
  }

  function restart(shuffle = false) {
    const nextQuestions = shuffle ? shuffleItems(getQuestions()) : getQuestions();
    setQuestions(nextQuestions);
    setAnswers(Array(nextQuestions.length).fill(null));
    setIndex(0);
    setSelected(null);
    setFinished(false);
  }

  if (finished) {
    const percent = Math.round((score / questions.length) * 100);

    return (
      <section className="card text-center">
        <p className="text-xs font-black uppercase text-blue-600">Quiz Complete</p>
        <h1 className="mt-3 text-5xl font-black text-blue-700 dark:text-blue-300">{score}/{questions.length}</h1>
        <p className="mt-2 text-xl font-bold">{percent}%</p>
        <p className="mt-3 text-slate-500 dark:text-slate-400">Review your answers and continue improving.</p>
        <button className="btn-primary mt-6" onClick={() => restart(false)}>Retake Quiz</button>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <section className="card">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-black text-slate-500 dark:text-slate-400">Question {index + 1} of {questions.length}</p>
            <p className="font-black">Score: {score}</p>
          </div>
          <div className="flex gap-2">
            <button className="btn-soft" onClick={() => restart(true)}><Shuffle size={18} /> Shuffle</button>
            <button className="btn-soft" onClick={() => restart(false)}><TimerReset size={18} /> Reset</button>
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
          <div className="h-full bg-gradient-to-r from-blue-600 to-cyan-400" style={{ width: `${progress}%` }} />
        </div>
      </section>

      <section className="card">
        <h1 className="text-2xl font-black leading-snug">{question.question}</h1>

        <div className="mt-6 grid gap-3">
          {question.options.map((option, optionIndex) => (
            <label
              key={option}
              className={`cursor-pointer rounded-2xl border p-4 font-bold transition ${
                selected === optionIndex
                  ? "border-blue-600 bg-blue-50 text-blue-800 dark:bg-blue-500/20 dark:text-blue-100"
                  : "border-slate-200 bg-white/70 hover:border-blue-300 dark:border-white/10 dark:bg-white/5"
              }`}
            >
              <input className="hidden" type="radio" checked={selected === optionIndex} onChange={() => setSelected(optionIndex)} />
              {String.fromCharCode(65 + optionIndex)}. {option}
            </label>
          ))}
        </div>

        <button className="btn-primary mt-6" onClick={submit} disabled={selected === null}>
          <CheckCircle size={18} />
          Submit Answer
        </button>
      </section>
    </div>
  );
}
