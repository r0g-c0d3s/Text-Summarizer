import React, { useEffect, useState } from "react";
import Delete from "./assets/delete.png";

function App() {
  const [value, setValue] = useState("");
  const [data, setData] = useState([]);
  const [flashcards, setFlashcards] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [error, setError] = useState(null);
  const [showFlashcards, setShowFlashcards] = useState(false);

  // Handle form submission to summarize content
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!value.trim()) {
      alert("Please provide valid text to summarize.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const requestOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Extract the main points from the following text and turn them into questions and answers one after another that a student can use for study purposes:\n\n${value}`
          }]
        }]
      }),
    };

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=AIzaSyCgg5TkGwAD4hzO0JKVo9FQ4p5kIimr76A`, requestOptions);
      if (!response.ok) throw new Error("Failed to fetch summary");
      const dt = await response.json();
      const text = dt.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (!text) throw new Error("Invalid response.");

      // Split the response into individual questions and answers
      const qaPairs = text.split("\n").filter((line) => line.trim() !== "").map((line) => {
        const [question, answer] = line.split("?").map((part) => part.trim());
        return { question: `${question}?`, answer: answer || "" };
      });

      setData(qaPairs);

      // Save the summary to MongoDB
      await fetch("http://localhost:5000/summaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
    } catch (err) {
      setError(err.message);
      console.error("Summarization error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // Fetch data from MongoDB
  const fetchLocalStorage = async () => {
    try {
      const summaryResponse = await fetch("http://localhost:5000/summaries");
      const flashcardResponse = await fetch("http://localhost:5000/flashcards");

      const summaries = await summaryResponse.json();
      const flashcards = await flashcardResponse.json();

      setData(summaries);
      setFlashcards(flashcards);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  // Add to flashcards
  const addToFlashcards = async (summary) => {
    const newFlashcard = {
      summary: summary.text,
    };
    const updatedFlashcards = [newFlashcard, ...flashcards];
    setFlashcards(updatedFlashcards);

    await fetch("http://localhost:5000/flashcards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newFlashcard),
    });
  };

  // Delete flashcard
  const deleteFlashcard = async (id) => {
    const updatedFlashcards = flashcards.filter((card) => card._id !== id);
    setFlashcards(updatedFlashcards);

    await fetch(`http://localhost:5000/flashcards/${id}`, { method: "DELETE" });
  };

  // Copy text to clipboard
  const copyTextToClipboard = async (text, index) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1500);
    } catch (err) {
      console.error("Failed to copy text:", err);
      alert("Could not copy text to clipboard.");
    }
  };

  useEffect(() => {
    fetchLocalStorage();
  }, []);

  return (
    <div className="w-full bg-[#0f172a] h-full min-h-[100vh] py-4 px-4 md:px-20">
      <header className="flex justify-between items-center w-full h-10 px-5 2xl:px-40">
        <h3 className="cursor-pointer text-3xl font-bold text-cyan-600">
          Flash
        </h3>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowFlashcards(!showFlashcards)}
            className="text-white bg-green-600 px-3 py-1 rounded"
          >
            {showFlashcards ? "Hide Flashcards" : "View Flashcards"}
          </button>
        </div>
      </header>

      <main className="flex flex-col items-center justify-center mt-4 p-4">
        <h1 className="text-3xl text-white text-center leading-10 font-semibold">
          Make Learning
          <br />
          <span className="text-5xl font-bold text-cyan-500">Easy</span>
        </h1>
        <p className="mt-5 text-lg text-gray-500 sm:text-xl text-center max-w-2xl">
          Paste your text below to get a quick summary!
        </p>

        <textarea
          placeholder="Paste text content here ..."
          rows={6}
          className="block w-full md:w-[650px] rounded-md border border-slate-700 bg-slate-800 p-2 text-sm shadow-lg font-medium text-white focus:border-gray-500 focus:outline-none focus:ring-0 mt-5"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        ></textarea>

        {value.trim() && (
          <button
            className={`mt-5 bg-blue-500 px-5 py-2 text-white text-md font-medium cursor-pointer rounded-md ${
              submitting ? "opacity-50 cursor-not-allowed" : ""
            }`}
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? "Please wait..." : "Submit"}
          </button>
        )}

        {error && <p className="text-red-500 mt-3">{error}</p>}
      </main>

      {data.length > 0 && (
        <section className="w-full mt-10 flex flex-col gap-5 shadow-md items-center justify-center">
          <p className="text-white font-semibold text-lg">Summary History</p>
          {data.map((d, index) => (
            <div key={index} className="max-w-2xl bg-slate-800 p-3 rounded-md w-full">
              <div className="text-gray-400 text-lg">
                {/* Render questions and answers */}
                {d.question && <p><strong>Q:</strong> {d.question}</p>}
                {d.answer && <p><strong>A:</strong> {d.answer}</p>}
              </div>
              <div className="flex gap-5 items-center justify-end mt-2">
                <p
                  className="text-gray-500 font-semibold cursor-pointer"
                  onClick={() => copyTextToClipboard(d.text, index)}
                >
                  {copiedIndex === index ? "Copied" : "Copy"}
                </p>
                <p
                  className="text-green-500 font-semibold cursor-pointer"
                  onClick={() => addToFlashcards(d)}
                >
                  Add to Flashcards
                </p>
                <span
                  className="cursor-pointer"
                  onClick={() => deleteFlashcard(d._id)} // Ensure 'd' has '_id'
                >
                  <img src={Delete} alt="Delete" className="w-6 h-6" />
                </span>
              </div>
            </div>
          ))}
        </section>
      )}

      {showFlashcards && (
        <section className="w-full mt-10 flex flex-col gap-5 shadow-md items-center justify-center">
          <p className="text-white font-semibold text-lg">Flashcards</p>
          {flashcards.length === 0 ? (
            <p className="text-gray-400">No flashcards yet. Add a summary to create a flashcard!</p>
          ) : (
            flashcards.map((card) => (
              <div key={card._id} className="max-w-2xl bg-slate-700 p-3 rounded-md w-full">
                <p className="text-gray-300 text-lg">{card.summary}</p>
                <div className="flex gap-5 items-center justify-end mt-2">
                  <span
                    className="cursor-pointer text-red-500"
                    onClick={() => deleteFlashcard(card._id)} // Ensure 'card' has '_id'
                  >
                    Delete
                  </span>
                </div>
              </div>
            ))
          )}
        </section>
      )}
    </div>
  );
}

export default App;
