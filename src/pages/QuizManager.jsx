import { Plus, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { Navigate } from "react-router-dom";
import { getQuestions, saveQuestions } from "../lib/storage";
import PremiumDialog from "../components/PremiumDialog";
import Toast from "../components/Toast";

export default function QuizManager({ user }) {
  const [questions, setQuestions] = useState(getQuestions());
  const [pendingDelete, setPendingDelete] = useState(null);
  const [toast, setToast] = useState(null);

  if (user.role !== "admin") return <Navigate to="/" replace />;

  function updateQuestion(index, field, value) {
    const next = [...questions];
    next[index] = { ...next[index], [field]: value };
    setQuestions(next);
  }

  function updateOption(qIndex, oIndex, value) {
    const next = [...questions];
    next[qIndex].options[oIndex] = value;
    setQuestions(next);
  }

  function addQuestion() {
    setQuestions([
      ...questions,
      {
        question: "New question",
        options: ["Option A", "Option B", "Option C", "Option D"],
        answer: 0,
        explanation: "Short explanation.",
        category: "General"
      }
    ]);
  }

function deleteQuestion(index) {
  setPendingDelete(index);
}

function confirmDelete() {
  setQuestions(questions.filter((_, itemIndex) => itemIndex !== pendingDelete));
  setPendingDelete(null);
  setToast({
    type: "success",
    title: "Question deleted",
    message: "The question has been removed from the local question bank."
  });
}

function save() {
  saveQuestions(questions);
  setToast({
    type: "success",
    title: "Question bank saved",
    message: "All quiz and flashcard changes have been saved locally."
  });
}

  return (
    <div className="space-y-5">
      <section className="card flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-black uppercase text-blue-600">Admin</p>
          <h1 className="text-3xl font-black">Quiz Management</h1>
          <p className="text-slate-500 dark:text-slate-400">Manage questions, answers, explanations, and categories.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-soft" onClick={addQuestion}><Plus size={18} /> Add</button>
          <button className="btn-primary" onClick={save}><Save size={18} /> Save</button>
        </div>
      </section>

      {questions.map((question, index) => (
        <section key={index} className="card space-y-3">
          <div className="flex justify-between gap-3">
            <h2 className="font-black">Question {index + 1}</h2>
            <button className="btn-soft !w-auto" onClick={() => deleteQuestion(index)}>
              <Trash2 size={17} />
            </button>
          </div>

          <textarea className="input min-h-24" value={question.question} onChange={(e) => updateQuestion(index, "question", e.target.value)} />

          <div className="grid gap-3 md:grid-cols-2">
            {question.options.map((option, optionIndex) => (
              <input
                key={optionIndex}
                className="input"
                value={option}
                onChange={(e) => updateOption(index, optionIndex, e.target.value)}
              />
            ))}
          </div>

          <select className="input" value={question.answer} onChange={(e) => updateQuestion(index, "answer", Number(e.target.value))}>
            <option value={0}>A is correct</option>
            <option value={1}>B is correct</option>
            <option value={2}>C is correct</option>
            <option value={3}>D is correct</option>
          </select>

          <input className="input" value={question.explanation} onChange={(e) => updateQuestion(index, "explanation", e.target.value)} />
        </section>
      ))}

      <PremiumDialog
  open={pendingDelete !== null}
  type="warning"
  title="Delete this question?"
  message="This action removes the question from the local question bank."
  confirmText="Delete Question"
  onConfirm={confirmDelete}
  onClose={() => setPendingDelete(null)}
/>

<Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
