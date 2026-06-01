import { ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";
import { useState } from "react";
import { getQuestions } from "../lib/storage";

export default function Flashcards() {
  const [questions] = useState(getQuestions());
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const question = questions[index];
  const progress = ((index + 1) / questions.length) * 100;

  function next() {
    setIndex(index < questions.length - 1 ? index + 1 : 0);
    setFlipped(false);
  }

  function previous() {
    setIndex(index > 0 ? index - 1 : questions.length - 1);
    setFlipped(false);
  }

  return (
    <div className="space-y-5">
      <section className="card">
        <div className="flex justify-between gap-3 font-black text-slate-500 dark:text-slate-400">
          <span>Card {index + 1} of {questions.length}</span>
          <span>Flashcard Study</span>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
          <div className="h-full bg-gradient-to-r from-blue-600 to-teal-400" style={{ width: `${progress}%` }} />
        </div>
      </section>

      <section className="relative min-h-[430px] perspective-1000">
        <div className={`absolute inset-0 transition duration-500 [transform-style:preserve-3d] ${flipped ? "[transform:rotateY(180deg)]" : ""}`}>
          <article className="card absolute inset-0 grid place-items-center [backface-visibility:hidden]">
            <div className="text-center">
              <h1 className="text-2xl font-black leading-snug lg:text-3xl">{question.question}</h1>
              <button className="btn-primary mt-8" onClick={() => setFlipped(true)}>
                <RotateCcw size={18} />
                Flip Card
              </button>
            </div>
          </article>

          <article className="card absolute inset-0 grid place-items-center bg-gradient-to-br from-blue-50 to-teal-50 text-center [backface-visibility:hidden] [transform:rotateY(180deg)] dark:from-blue-950 dark:to-teal-950">
            <div>
              <p className="text-xs font-black uppercase text-blue-600 dark:text-blue-300">Answer</p>
              <h1 className="mt-4 rounded-2xl border border-blue-200 bg-white/80 p-5 text-2xl font-black text-blue-800 dark:border-blue-500/30 dark:bg-white/10 dark:text-blue-100">
                {question.options[question.answer]}
              </h1>
              <p className="mt-4 rounded-2xl bg-white/70 p-4 text-slate-600 dark:bg-white/10 dark:text-slate-300">
                {question.explanation}
              </p>
              <button className="mt-6 rounded-xl bg-emerald-600 px-5 py-3 font-black text-white" onClick={() => setFlipped(false)}>
                Show Question
              </button>
            </div>
          </article>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <button className="btn-soft" onClick={previous}><ArrowLeft size={18} /> Previous</button>
        <button className="btn-primary" onClick={next}>Next <ArrowRight size={18} /></button>
        <button className="btn-soft" onClick={() => { setIndex(0); setFlipped(false); }}>Restart</button>
      </section>
    </div>
  );
}
