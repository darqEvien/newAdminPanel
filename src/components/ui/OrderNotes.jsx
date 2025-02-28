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
  const renderNotes = () => {
    if (!notes || notes.length === 0) {
      return <p className="text-gray-500">Not bulunmamaktadır.</p>;
    }

    const groupedNotes = groupNotesByDate(notes);

    if (Object.keys(groupedNotes).length === 0) {
      return <p className="text-gray-500">Not bulunmamaktadır.</p>;
    }

    const sortedDates = Object.keys(groupedNotes).sort(
      (a, b) =>
        new Date(b.split(".").reverse().join("-")) -
        new Date(a.split(".").reverse().join("-"))
    );

    return (
      <div className="space-y-3">
        {sortedDates.map((date) => (
          <div
            key={date}
            className="border border-gray-700 rounded-lg overflow-hidden"
          >
            <div
              className="flex items-center justify-between p-3 bg-gray-800 cursor-pointer"
              onClick={() => toggleNoteDate(date)}
            >
              <h3 className="text-sm font-medium text-gray-300">{date}</h3>
              <button className="text-gray-400 hover:text-blue-400">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {expandedNoteDates[date] ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 15l7-7 7 7"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 9l-7 7-7-7"
                    />
                  )}
                </svg>
              </button>
            </div>

            {expandedNoteDates[date] && (
              <div className="divide-y divide-gray-700">
                {groupedNotes[date]
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .map((note, index) => (
                    <div key={index} className="p-3 relative bg-gray-900/50">
                      <p className="text-gray-300 text-sm pr-8">
                        {note.content}
                      </p>
                      <span className="text-gray-500 text-xs mt-2 block">
                        {note.time}
                      </span>
                      <button
                        onClick={() => handleDeleteNote(date, index)}
                        className="absolute top-3 right-3 text-gray-500 hover:text-red-400"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 pb-4 z-10">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-base font-medium text-gray-200">Notlar</h2>
          <button
            onClick={() => setIsAddingNote(true)}
            className="text-blue-400 hover:text-blue-300 p-1 rounded-full hover:bg-blue-400/10"
          >
            <svg
              className="w-4 h-4"
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
          </button>
        </div>

        {isAddingNote && (
          <div className="mt-4 space-y-2">
            <textarea
              ref={textareaRef}
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Notunuzu yazın... (Kaydetmek için Enter'a basın)"
              className="w-full h-24 bg-gray-800 border border-gray-700 rounded-lg p-2 text-gray-300 text-sm resize-none focus:outline-none focus:border-blue-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsAddingNote(false)}
                className="px-3 py-1 text-sm text-gray-400 hover:text-gray-300"
              >
                İptal
              </button>
              <button
                onClick={handleAddNote}
                disabled={notesLoading || !newNote.trim()}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {notesLoading ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4 mt-4 overflow-y-auto">
        {notesLoading ? (
          <p className="text-gray-500">Notlar yükleniyor...</p>
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
