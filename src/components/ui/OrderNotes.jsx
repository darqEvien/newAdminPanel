import { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { ref, get, set } from "firebase/database";
import { database } from "../../firebase/firebaseConfig";

// Helper function to ensure notes are always in array format
const ensureNotesArray = (notes) => {
  if (!notes) return [];

  if (Array.isArray(notes)) return notes;

  if (typeof notes === "string") {
    return [
      {
        content: notes,
        date: new Date().toISOString(),
      },
    ];
  }

  if (typeof notes === "object") {
    return Object.values(notes);
  }

  return [];
};

const OrderNotes = ({ orderKey, isMainOrder, customerId }) => {
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState("");
  const [expandedNoteDates, setExpandedNoteDates] = useState({});
  const [notesLoading, setNotesLoading] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const textareaRef = useRef(null);

  // Fetch notes when component mounts
  useEffect(() => {
    const fetchNotes = async () => {
      try {
        setNotesLoading(true);
        const notesPath = isMainOrder
          ? `customers/${customerId}/orderNotes/`
          : `customers/${customerId}/otherOrders/${orderKey}/orderNotes`;

        const noteRef = ref(database, notesPath);
        const snapshot = await get(noteRef);

        if (snapshot.exists()) {
          const notesData = snapshot.val();
          setNotes(ensureNotesArray(notesData));

          // Auto-expand most recent date
          const groupedNotes = groupNotesByDate(ensureNotesArray(notesData));
          const mostRecentDate = Object.keys(groupedNotes).sort(
            (a, b) =>
              new Date(b.split(".").reverse().join("-")) -
              new Date(a.split(".").reverse().join("-"))
          )[0];

          if (mostRecentDate) {
            setExpandedNoteDates({ [mostRecentDate]: true });
          }
        }
      } catch (error) {
        console.error("Error fetching notes:", error);
      } finally {
        setNotesLoading(false);
      }
    };

    if (orderKey && customerId) {
      fetchNotes();
    }
  }, [orderKey, isMainOrder, customerId]);

  // Group notes by date
  const groupNotesByDate = (notes) => {
    const safeNotes = ensureNotesArray(notes);

    if (!safeNotes.length) return {};

    return safeNotes.reduce((groups, note) => {
      const date = note.date ? new Date(note.date) : new Date();
      const dateKey = date.toLocaleDateString("tr-TR");

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }

      groups[dateKey].push({
        ...note,
        time: date.toLocaleTimeString("tr-TR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      });

      return groups;
    }, {});
  };

  // Toggle a date group's expanded state
  const toggleNoteDate = (date) => {
    setExpandedNoteDates((prev) => ({
      ...prev,
      [date]: !prev[date],
    }));
  };

  // Handle adding a new note
  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    setNotesLoading(true);
    try {
      const notesPath = isMainOrder
        ? `customers/${customerId}/orderNotes/`
        : `customers/${customerId}/otherOrders/${orderKey}/orderNotes`;

      const noteRef = ref(database, notesPath);
      const newNoteData = {
        content: newNote.trim(),
        date: new Date().toISOString(),
      };

      // Get existing notes or empty array
      const snapshot = await get(noteRef);
      let existingNotes = [];

      if (snapshot.exists()) {
        existingNotes = ensureNotesArray(snapshot.val());
      }

      // Add new note and update Firebase
      const updatedNotes = [...existingNotes, newNoteData];
      await set(noteRef, updatedNotes);

      // Update local state
      setNotes(updatedNotes);
      setNewNote("");
      setIsAddingNote(false);

      // Auto-expand the current date
      const currentDate = new Date().toLocaleDateString("tr-TR");
      setExpandedNoteDates((prev) => ({
        ...prev,
        [currentDate]: true,
      }));
    } catch (error) {
      console.error("Error adding note:", error);
    } finally {
      setNotesLoading(false);
    }
  };

  // Handle deleting a note
  const handleDeleteNote = async (dateKey, noteIndex) => {
    try {
      const notesPath = isMainOrder
        ? `customers/${customerId}/orderNotes`
        : `customers/${customerId}/otherOrders/${orderKey}/orderNotes`;

      const noteRef = ref(database, notesPath);

      // Get current notes
      const snapshot = await get(noteRef);
      if (snapshot.exists()) {
        const notesData = snapshot.val();
        const currentNotes = ensureNotesArray(notesData);

        // Find actual index in the flat array
        const groupedNotes = groupNotesByDate(currentNotes);
        let actualIndex = -1;
        let counter = 0;

        for (const date of Object.keys(groupedNotes)) {
          for (let i = 0; i < groupedNotes[date].length; i++) {
            if (date === dateKey && i === noteIndex) {
              actualIndex = counter;
              break;
            }
            counter++;
          }
          if (actualIndex !== -1) break;
        }

        if (actualIndex !== -1) {
          const updatedNotes = currentNotes.filter(
            (_, index) => index !== actualIndex
          );
          await set(noteRef, updatedNotes);
          setNotes(updatedNotes);
        }
      }
    } catch (error) {
      console.error("Error deleting note:", error);
    }
  };

  // Handle keypress in textarea (Enter to save)
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAddNote();
    }
  };

  // Focus on textarea when isAddingNote changes to true
  useEffect(() => {
    if (isAddingNote && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isAddingNote]);

  // Render the notes section
  // renderNotes fonksiyonu için yeni tasarım
  const renderNotes = () => {
    if (!notes || notes.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-8 px-4 bg-gray-800/20 rounded-lg border border-gray-700/30 text-center">
          <svg
            className="w-12 h-12 text-gray-600 mb-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-gray-500 text-sm">Not bulunmamaktadır</p>
          <p className="text-gray-600 text-xs mt-1">
            Sipariş ile ilgili notları buraya ekleyebilirsiniz
          </p>
        </div>
      );
    }

    const groupedNotes = groupNotesByDate(notes);

    if (Object.keys(groupedNotes).length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-8 px-4 bg-gray-800/20 rounded-lg border border-gray-700/30 text-center">
          <svg
            className="w-12 h-12 text-gray-600 mb-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-gray-500 text-sm">Not bulunmamaktadır</p>
          <p className="text-gray-600 text-xs mt-1">
            Sipariş ile ilgili notları buraya ekleyebilirsiniz
          </p>
        </div>
      );
    }

    const sortedDates = Object.keys(groupedNotes).sort(
      (a, b) =>
        new Date(b.split(".").reverse().join("-")) -
        new Date(a.split(".").reverse().join("-"))
    );

    return (
      <div className="space-y-4">
        {sortedDates.map((date) => (
          <div
            key={date}
            className="border border-gray-700/50 rounded-lg overflow-hidden bg-gray-800/30 backdrop-blur-sm transition-all duration-200 hover:border-gray-600/50"
          >
            {/* Date Header with Expand Button */}
            <div
              className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-800/80 to-gray-800/40 cursor-pointer group"
              onClick={() => toggleNoteDate(date)}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`h-2 w-2 rounded-full ${
                    expandedNoteDates[date] ? "bg-blue-500" : "bg-gray-500"
                  } transition-colors duration-200`}
                ></div>
                <h3 className="text-sm font-medium text-gray-300">{date}</h3>
              </div>
              <button className="text-gray-500 group-hover:text-blue-400 transition-colors duration-200">
                <svg
                  className={`w-4 h-4 transform transition-transform duration-200 ${
                    expandedNoteDates[date] ? "rotate-180" : "rotate-0"
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
            </div>

            {/* Notes List - Collapsible */}
            {expandedNoteDates[date] && (
              <div className="divide-y divide-gray-700/40">
                {groupedNotes[date]
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .map((note, index) => (
                    <div key={index} className="relative group">
                      <div className="p-3 bg-gray-900/30 hover:bg-gray-900/50 transition-colors duration-150">
                        <p className="text-gray-300 text-sm pr-8 whitespace-pre-wrap">
                          {note.content}
                        </p>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-gray-500 text-xs flex items-center gap-1">
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            {note.time}
                          </span>

                          <button
                            onClick={() => handleDeleteNote(date, index)}
                            className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all duration-200"
                          >
                            <svg
                              className="w-3.5 h-3.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Başlık ve not ekleme kısmı için yeni tasarım
  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 pb-4 z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 bg-blue-500 rounded-full"></div>
            <h2 className="text-base font-medium text-gray-200">Notlar</h2>
          </div>

          {!isAddingNote && (
            <button
              onClick={() => setIsAddingNote(true)}
              className="flex items-center gap-1 text-blue-400 hover:text-blue-300 py-1 px-2.5 rounded-full hover:bg-blue-500/10 border border-blue-500/30 transition-all duration-200"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span className="text-xs font-medium">Yeni Not</span>
            </button>
          )}
        </div>

        {isAddingNote && (
          <div className="mt-4 space-y-2">
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Notunuzu yazın... (Kaydetmek için Enter'a basın)"
                className="w-full h-28 bg-gray-800/50 border border-gray-700 rounded-lg p-3 text-gray-300 text-sm resize-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
              />
              <div className="absolute top-2 right-2">
                <div className="flex items-center justify-center h-5 w-5 text-[10px] font-medium bg-gray-700/50 text-gray-400 rounded-full">
                  {newNote.length}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setIsAddingNote(false);
                  setNewNote("");
                }}
                className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-300 border border-gray-700 rounded hover:bg-gray-800 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleAddNote}
                disabled={notesLoading || !newNote.trim()}
                className="px-3 py-1.5 text-xs bg-blue-600/80 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:hover:bg-blue-600/80 transition-all duration-200 flex items-center gap-1.5"
              >
                {notesLoading ? (
                  <>
                    <svg
                      className="animate-spin h-3 w-3 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span>Kaydediliyor</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>Kaydet</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4 mt-2 overflow-y-auto">
        {notesLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex flex-col items-center">
              <svg
                className="animate-spin h-6 w-6 text-blue-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span className="mt-2 text-sm text-gray-400">
                Notlar yükleniyor...
              </span>
            </div>
          </div>
        ) : (
          renderNotes()
        )}
      </div>
    </div>
  );
};

OrderNotes.propTypes = {
  orderKey: PropTypes.string.isRequired,
  isMainOrder: PropTypes.bool.isRequired,
  customerId: PropTypes.string.isRequired,
};

export default OrderNotes;
