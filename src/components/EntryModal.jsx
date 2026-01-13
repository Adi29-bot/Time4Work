import { useState, useMemo } from "react";
import { format } from "date-fns";
import { useFirebase } from "../context/firebase";
import { MapPin, X, Clock, User, Coffee, Car, ArrowLeft, CheckCircle, Edit2, Plus, Trash2 } from "lucide-react";

const OPTIONS = [
  { id: "check-in", label: "Check In", icon: Clock, requiresLoc: true },
  { id: "check-out", label: "Check Out", icon: Clock, requiresLoc: true },
  { id: "break", label: "Break", icon: Coffee, requiresLoc: false },
  { id: "client-in", label: "In with Client", icon: User, requiresLoc: true },
  { id: "client-out", label: "Out with Client", icon: User, requiresLoc: true },
  { id: "pickup", label: "Pickup", icon: Car, requiresLoc: false },
  { id: "dropoff", label: "Dropoff", icon: Car, requiresLoc: false },
];

export default function EntryModal({ date, existingEntries = [], onClose }) {
  const { addTimeEntry, deleteTimeEntry } = useFirebase();

  const [step, setStep] = useState(existingEntries.length > 0 ? "list" : "select");
  const [selectedOption, setSelectedOption] = useState(null);
  const [location, setLocation] = useState(null);
  const [entryId, setEntryId] = useState(null);
  const [time, setTime] = useState(format(new Date(), "HH:mm"));
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const dailyHours = useMemo(() => {
    if (!existingEntries || existingEntries.length === 0) return 0;
    const sorted = [...existingEntries].sort((a, b) => a.time.localeCompare(b.time));
    let mins = 0;
    let start = null;

    sorted.forEach((entry) => {
      if (entry.type === "check-in") start = entry.time;
      if (entry.type === "check-out" && start) {
        const [h1, m1] = start.split(":").map(Number);
        const [h2, m2] = entry.time.split(":").map(Number);
        mins += h2 * 60 + m2 - (h1 * 60 + m1);
        start = null;
      }
    });
    return (mins / 60).toFixed(1);
  }, [existingEntries]);

  // --- HANDLERS ---
  const handleSelect = (option) => {
    setSelectedOption(option);
    setEntryId(null);
    setTime(format(new Date(), "HH:mm"));
    setComment("");
    setStep(option.requiresLoc ? "permission" : "form");
  };

  const handleEdit = (entry) => {
    const optionConfig = OPTIONS.find((opt) => opt.id === entry.type);
    setSelectedOption(optionConfig);
    setEntryId(entry.id);
    setTime(entry.time);
    setComment(entry.comment || "");
    setLocation(entry.location || null);
    setStep("form");
  };

  const handleDeleteItem = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Delete this entry?")) return;

    try {
      await deleteTimeEntry(date, id);
      onClose();
    } catch (err) {
      alert("Could not delete");
    }
  };

  const requestLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setStep("form");
        },
        () => alert("Location required."),
        { enableHighAccuracy: true }
      );
    } else {
      alert("Not supported");
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const entryData = {
      ...(entryId && { id: entryId }),
      type: selectedOption.id,
      label: selectedOption.label,
      time: time,
      comment: comment,
      timestamp: new Date().toISOString(),
      ...(location && { location: location }),
    };

    try {
      await addTimeEntry(date, entryData);
      onClose();
    } catch (error) {
      alert("Failed to save.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4'>
      <div className='bg-white w-full max-w-md p-6 rounded-t-3xl sm:rounded-3xl h-[85vh] sm:h-auto overflow-y-auto shadow-2xl transition-transform'>
        <div className='flex justify-between items-center mb-6 border-b border-gray-100 pb-4'>
          <div className='flex items-center gap-2'>
            {step !== "list" && (
              <button onClick={() => setStep("list")} className='p-1 -ml-2 text-gray-400 hover:text-gray-600'>
                <ArrowLeft size={20} />
              </button>
            )}
            <div>
              <h3 className='text-xl font-bold text-gray-800'>{format(date, "MMMM do")}</h3>
              {step === "list" && <p className='text-sm text-green-600 font-bold'>Total: {dailyHours} Hours</p>}
            </div>
          </div>
          <button onClick={onClose} className='p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition'>
            <X size={20} className='text-gray-600' />
          </button>
        </div>

        {/* --- VIEW 1: LIST --- */}
        {step === "list" && (
          <div className='animate-in fade-in duration-300'>
            <div className='flex justify-between items-end mb-3'>
              <h4 className='text-sm font-bold text-gray-400 uppercase tracking-wider'>Today's Activity</h4>
            </div>

            <div className='space-y-3 mb-6'>
              {existingEntries.length === 0 && <div className='text-center py-8 text-gray-400 italic'>No entries for this day yet.</div>}

              {existingEntries.map((entry, idx) => (
                <div key={idx} onClick={() => handleEdit(entry)} className='flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 active:bg-blue-50 active:border-blue-200 cursor-pointer transition group'>
                  <div className='flex items-center gap-3'>
                    <div className='p-2 bg-white rounded-full shadow-sm text-blue-600'>
                      {(() => {
                        const Icon = OPTIONS.find((o) => o.id === entry.type)?.icon || Clock;
                        return <Icon size={18} />;
                      })()}
                    </div>
                    <div>
                      <p className='font-bold text-gray-800'>{entry.label}</p>
                      <p className='text-xs text-gray-500'>
                        {entry.time} {entry.comment && `• "${entry.comment}"`}
                      </p>
                    </div>
                  </div>

                  <div className='flex items-center gap-2'>
                    <button onClick={(e) => handleDeleteItem(e, entry.id)} className='p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition'>
                      <Trash2 size={18} />
                    </button>
                    <Edit2 size={16} className='text-gray-300' />
                  </div>
                </div>
              ))}
            </div>

            <button onClick={() => setStep("select")} className='w-full py-4 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center text-gray-500 font-bold hover:bg-gray-50 hover:border-gray-400 transition'>
              <Plus size={20} className='mr-2' /> Add Entry
            </button>
          </div>
        )}

        {/* --- VIEW 2: SELECT --- */}
        {step === "select" && (
          <div className='grid grid-cols-2 gap-4 animate-in fade-in zoom-in duration-300'>
            {OPTIONS.map((opt) => {
              const Icon = opt.icon;
              return (
                <button key={opt.id} onClick={() => handleSelect(opt)} className='flex flex-col items-center justify-center p-5 bg-gray-50 rounded-2xl border-2 border-transparent hover:border-blue-500 hover:bg-blue-50 transition active:scale-95'>
                  <div className='bg-white p-3 rounded-full shadow-sm mb-3 text-blue-600'>
                    <Icon size={24} />
                  </div>
                  <span className='font-medium text-gray-700'>{opt.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* --- VIEW 3: PERMISSION --- */}
        {step === "permission" && (
          <div className='text-center py-8 animate-in slide-in-from-right duration-300'>
            <div className='bg-blue-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse'>
              <MapPin className='w-10 h-10 text-blue-600' />
            </div>
            <h4 className='text-2xl font-bold text-gray-900 mb-3'>Location Required</h4>
            <p className='text-gray-500 mb-8 px-4'>
              To verify your <strong>{selectedOption?.label}</strong>, we need to attach your current location.
            </p>
            <button onClick={requestLocation} className='w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg mb-3'>
              Allow Location
            </button>
            <button onClick={() => setStep("select")} className='text-gray-400 font-medium'>
              Cancel
            </button>
          </div>
        )}

        {/* --- VIEW 4: FORM --- */}
        {step === "form" && (
          <div className='space-y-6 animate-in slide-in-from-right duration-300'>
            {location && (
              <div className='flex items-center gap-2 bg-green-50 text-green-700 px-4 py-3 rounded-xl text-sm border border-green-100'>
                <CheckCircle size={16} /> <span>Location tagged</span>
              </div>
            )}

            <div>
              <label className='block text-sm font-bold text-gray-700 mb-2'>Time</label>
              <div className='relative'>
                <Clock className='absolute left-4 top-1/2 -translate-y-1/2 text-gray-400' size={20} />
                <input type='time' value={time} onChange={(e) => setTime(e.target.value)} className='w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white text-lg font-medium' />
              </div>
            </div>

            <div>
              <label className='block text-sm font-bold text-gray-700 mb-2'>Comments</label>
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} className='w-full p-4 border border-gray-200 rounded-xl bg-gray-50' rows={3} placeholder='Add notes...'></textarea>
            </div>

            <button onClick={handleSubmit} disabled={isSubmitting} className='w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-4 rounded-xl font-bold text-lg shadow-lg mt-4'>
              {isSubmitting ? "Saving..." : entryId ? "Update Entry" : "Confirm & Save"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
