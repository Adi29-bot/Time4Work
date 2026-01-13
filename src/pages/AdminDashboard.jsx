import { useState, useEffect } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, getDay } from "date-fns";
import { ChevronLeft, ChevronRight, MapPin, Clock, Users, ClipboardCheck, UserPlus, CheckCircle, AlertCircle, Camera, UploadCloud, Pencil, Trash2, X, Save, LogOut } from "lucide-react";
import { useFirebase } from "../context/firebase";

// --- CONFIGURATION ---
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/di1bvbygy/image/upload";
const UPLOAD_PRESET = "time4work_preset";

const LocationDisplay = ({ lat, lng }) => {
  const [address, setAddress] = useState("Locating address...");
  useEffect(() => {
    const fetchAddress = async () => {
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        const data = await response.json();
        const simplified = data.display_name.split(",").slice(0, 3).join(",");
        setAddress(simplified);
      } catch (error) {
        setAddress("Address lookup failed");
      }
    };
    fetchAddress();
  }, [lat, lng]);
  return (
    <a href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`} target='_blank' rel='noopener noreferrer' className='flex items-start text-xs text-blue-600 mt-2 bg-blue-50 w-full p-2 rounded border border-blue-100 hover:bg-blue-100 transition'>
      <MapPin size={14} className='mr-1 mt-0.5 flex-shrink-0' />
      <span className='break-words w-full'>
        {address} <span className='text-[10px] text-blue-400 block'>(Click to open Map)</span>
      </span>
    </a>
  );
};

export default function AdminDashboard() {
  const { logoutUser, getAllStaff, getStaffMonthData, signupUserWithEmailAndPassword, updateUserProfile, deleteUserDocument } = useFirebase();

  const [activeTab, setActiveTab] = useState("timesheets");
  const [staffList, setStaffList] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [staffData, setStaffData] = useState(null);
  const [selectedDayDetails, setSelectedDayDetails] = useState(null);

  // --- EDIT & REGISTER STATE ---
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "staff" });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [regLoading, setRegLoading] = useState(false);
  const [regMessage, setRegMessage] = useState({ type: "", text: "" });

  // 1. Load Staff
  const loadStaff = async () => {
    try {
      const snapshot = await getAllStaff();
      const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setStaffList(list);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadStaff();
  }, [activeTab]);

  // 2. Load Month Data
  useEffect(() => {
    if (!selectedStaffId) return;
    const loadMonthData = async () => {
      try {
        const data = await getStaffMonthData(selectedStaffId, currentDate);
        setStaffData(data);
        setSelectedDayDetails(null);
      } catch (err) {
        console.error(err);
      }
    };
    loadMonthData();
  }, [selectedStaffId, currentDate]);

  const selectedStaffMember = staffList.find((s) => s.id === selectedStaffId);

  // Helper: Daily Total
  const calculateDailyTotal = (entries) => {
    if (!entries) return 0;
    const sorted = [...entries].sort((a, b) => a.time.localeCompare(b.time));
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
  };

  // --- HANDLER: Image Selection ---
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // --- HANDLER: Upload Image to Cloudinary ---
  const uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);
    const res = await fetch(CLOUDINARY_URL, { method: "POST", body: formData });
    if (!res.ok) throw new Error("Image upload failed");
    const data = await res.json();
    return data.secure_url.replace("/upload/", "/upload/w_200,h_200,c_fill,f_auto,q_auto/");
  };

  // --- HANDLER: Create New User ---
  const handleRegister = async (e) => {
    e.preventDefault();
    setRegLoading(true);
    setRegMessage({ type: "", text: "" });

    try {
      let photoURL = "";
      if (imageFile) photoURL = await uploadToCloudinary(imageFile);

      await signupUserWithEmailAndPassword(newUser.name, newUser.email, newUser.password, newUser.role, photoURL);

      setRegMessage({ type: "success", text: `User created!` });
      setNewUser({ name: "", email: "", password: "", role: "staff" });
      setImageFile(null);
      setImagePreview(null);
      loadStaff();
    } catch (err) {
      setRegMessage({ type: "error", text: "Failed: " + err.message });
    } finally {
      setRegLoading(false);
    }
  };

  // --- HANDLER: Open Edit Modal ---
  const openEditModal = (staff) => {
    setEditingUser({ ...staff });
    setImagePreview(staff.photoURL || null);
    setImageFile(null);
    setIsEditModalOpen(true);
  };

  // --- HANDLER: Save Edits ---
  const handleUpdateUser = async () => {
    setRegLoading(true);
    try {
      let photoURL = editingUser.photoURL;

      if (imageFile) {
        photoURL = await uploadToCloudinary(imageFile);
      }

      await updateUserProfile(editingUser.id, {
        name: editingUser.name,
        role: editingUser.role,
        photoURL: photoURL,
      });

      setIsEditModalOpen(false);
      loadStaff();
      alert("User updated successfully!");
    } catch (error) {
      alert("Update failed: " + error.message);
    } finally {
      setRegLoading(false);
    }
  };

  // --- HANDLER: Delete User ---
  const handleDeleteUser = async (uid) => {
    if (window.confirm("Are you sure you want to delete this user? This cannot be undone.")) {
      try {
        await deleteUserDocument(uid);
        setSelectedStaffId(null);
        loadStaff();
      } catch (error) {
        alert("Delete failed: " + error.message);
      }
    }
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayIndex = getDay(monthStart);

  return (
    <div className='min-h-screen bg-gray-50 p-6 font-sans relative'>
      <div className='flex justify-between items-center mb-8'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900'>Ready4Life Admin Portal</h1>
          <p className='text-xs text-gray-500'>Manage Staff & Timesheets</p>
        </div>
        <button onClick={logoutUser} className='text-sm text-red-500 font-medium bg-white border border-red-100 px-4 py-2 rounded-full hover:bg-red-50 transition'>
          <LogOut size={20} />
        </button>
      </div>

      <div className='flex bg-white p-1 rounded-xl shadow-sm border border-gray-100 w-full max-w-md mb-8 mx-auto'>
        <button onClick={() => setActiveTab("timesheets")} className={`flex-1 flex items-center justify-center py-2 text-sm font-medium rounded-lg transition-all ${activeTab === "timesheets" ? "bg-blue-50 text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
          <ClipboardCheck size={18} className='mr-2' /> View Timesheets
        </button>
        <button onClick={() => setActiveTab("register")} className={`flex-1 flex items-center justify-center py-2 text-sm font-medium rounded-lg transition-all ${activeTab === "register" ? "bg-blue-50 text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
          <UserPlus size={18} className='mr-2' /> Create Employee
        </button>
      </div>

      {/* TAB 1: TIMESHEETS */}
      {activeTab === "timesheets" && (
        <div className='animate-fade-in-up'>
          <div className='mb-8'>
            <h2 className='text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 ml-1'>Select Employee</h2>
            <div className='flex space-x-4 overflow-x-auto pb-4 scrollbar-hide'>
              {staffList.map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => setSelectedStaffId(emp.id)}
                  className={`flex flex-col items-center min-w-[72px] transition-all duration-300
                   ${selectedStaffId === emp.id ? "transform scale-110 opacity-100" : "opacity-60 grayscale"}`}
                >
                  <div className={`w-16 h-16 rounded-full border-2 mb-2 shadow-sm overflow-hidden flex items-center justify-center bg-white ${selectedStaffId === emp.id ? "border-blue-500 ring-2 ring-blue-100" : "border-gray-200"}`}>{emp.photoURL ? <img src={emp.photoURL} alt={emp.name} className='w-full h-full object-cover' /> : <span className='text-xl font-bold text-gray-400'>{emp.name?.charAt(0)}</span>}</div>
                  <span className='text-xs font-medium text-gray-700 truncate w-20 text-center'>{emp.name}</span>
                </button>
              ))}
            </div>
          </div>

          {selectedStaffId ? (
            <div className='bg-white p-6 rounded-3xl shadow-sm border border-gray-100'>
              <div className='flex items-center justify-between mb-6 pb-6 border-b border-gray-100'>
                <div className='flex items-center gap-3'>
                  <div className='w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold'>{selectedStaffMember?.photoURL ? <img src={selectedStaffMember.photoURL} className='w-full h-full rounded-full object-cover' /> : selectedStaffMember?.name?.[0]}</div>
                  <div>
                    <h3 className='font-bold text-gray-900'>{selectedStaffMember?.name}</h3>
                    <p className='text-xs text-gray-500 capitalize'>{selectedStaffMember?.role}</p>
                  </div>
                </div>
                <div className='flex gap-2'>
                  <button onClick={() => openEditModal(selectedStaffMember)} className='p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition'>
                    <Pencil size={18} />
                  </button>
                  <button onClick={() => handleDeleteUser(selectedStaffId)} className='p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition'>
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className='flex items-center justify-between mb-6'>
                <div className='flex items-center'>
                  <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className='p-2 hover:bg-gray-50 rounded-full border border-gray-100 mr-2'>
                    <ChevronLeft size={20} />
                  </button>
                  <div>
                    <h3 className='text-lg font-bold text-gray-800'>{format(currentDate, "MMMM yyyy")}</h3>
                    <p className='text-xs text-blue-600 font-bold'>Monthly Total: {staffData?.totalHours ? staffData.totalHours.toFixed(1) : "0.0"} Hrs</p>
                  </div>
                </div>
                <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className='p-2 hover:bg-gray-50 rounded-full border border-gray-100'>
                  <ChevronRight size={20} />
                </button>
              </div>

              <div className='grid grid-cols-7 gap-1 mb-6'>
                {["S", "M", "T", "W", "T", "F", "S"].map((d, index) => (
                  <div key={`${d}-${index}`} className='text-center text-xs font-bold text-gray-300 mb-2'>
                    {d}
                  </div>
                ))}

                {Array.from({ length: startDayIndex }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}

                {daysInMonth.map((day) => {
                  const dateKey = format(day, "yyyy-MM-dd");
                  const dayData = staffData?.entries?.[dateKey];
                  const hasEntries = dayData && dayData.length > 0;
                  return (
                    <button key={day.toString()} onClick={() => hasEntries && setSelectedDayDetails({ date: day, entries: dayData })} disabled={!hasEntries} className={`h-10 rounded-lg flex items-center justify-center text-sm font-medium transition-colors ${!isSameMonth(day, currentDate) ? "hidden" : ""} ${hasEntries ? "bg-green-100 text-green-700 font-bold border border-green-200 hover:bg-green-200" : "bg-gray-50 text-gray-300"}`}>
                      {format(day, "d")}
                    </button>
                  );
                })}
              </div>

              {selectedDayDetails && (
                <div className='border-t border-dashed border-gray-200 pt-6 animate-fade-in'>
                  <div className='flex justify-between items-center mb-4'>
                    <h4 className='font-bold text-gray-800 flex items-center'>
                      <span className='w-2 h-6 bg-blue-500 rounded-full mr-2'></span>
                      {format(selectedDayDetails.date, "MMM do")}
                    </h4>
                    <span className='bg-gray-900 text-white text-xs px-2 py-1 rounded'>Day Total: {calculateDailyTotal(selectedDayDetails.entries)} Hrs</span>
                  </div>
                  <div className='space-y-4'>
                    {selectedDayDetails.entries.map((entry, idx) => (
                      <div key={idx} className='bg-gray-50 p-4 rounded-xl text-sm border border-gray-100 hover:border-blue-200 transition-colors'>
                        <div className='flex justify-between items-start mb-2'>
                          <div className='flex flex-col'>
                            <span className='font-bold text-blue-900 uppercase text-xs tracking-wider bg-blue-100 px-2 py-1 rounded w-fit mb-1'>{entry.label || entry.id}</span>
                            {entry.isEdited && (
                              <span className='flex items-center text-[10px] text-amber-600 font-bold'>
                                <AlertCircle size={10} className='mr-1' /> Edited
                              </span>
                            )}
                          </div>
                          <span className='flex items-center text-gray-600 font-mono text-sm font-bold bg-white px-2 py-1 border rounded'>
                            <Clock size={14} className='mr-1' /> {entry.time || "N/A"}
                          </span>
                        </div>
                        {entry.comment && <p className='text-gray-600 italic text-xs mb-2 pl-2 border-l-2 border-gray-300'>"{entry.comment}"</p>}
                        {entry.location && <LocationDisplay lat={entry.location.lat} lng={entry.location.lng} />}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className='flex flex-col items-center justify-center h-64 text-gray-400 bg-white rounded-3xl border border-dashed border-gray-200'>
              <Users size={48} className='mb-4 opacity-20' />
              <p>Select a staff member above</p>
              <p className='text-sm'>to view their timesheets</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: REGISTER */}
      {activeTab === "register" && (
        <div className='max-w-xl mx-auto bg-white p-8 rounded-3xl shadow-sm border border-gray-100 animate-fade-in-up'>
          <div className='text-center mb-6'>
            <div className='w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4'>
              <UserPlus size={24} />
            </div>
            <h2 className='text-xl font-bold text-gray-800'>Create Account</h2>
          </div>
          {regMessage.text && (
            <div className={`p-4 rounded-xl mb-6 flex items-center text-sm ${regMessage.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              {regMessage.type === "success" ? <CheckCircle size={18} className='mr-2' /> : <AlertCircle size={18} className='mr-2' />}
              {regMessage.text}
            </div>
          )}
          <form onSubmit={handleRegister} className='space-y-4'>
            <div className='flex flex-col items-center mb-6'>
              <div className='relative w-24 h-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden group hover:border-blue-500 transition cursor-pointer'>
                {imagePreview ? <img src={imagePreview} className='w-full h-full object-cover' alt='Preview' /> : <Camera className='text-gray-400' size={32} />}
                <input type='file' accept='image/*' onChange={handleImageChange} className='absolute inset-0 opacity-0 cursor-pointer' />
              </div>
              <p className='text-xs text-gray-500 mt-2'>Tap to add profile photo</p>
            </div>
            <div>
              <label className='block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1'>Full Name</label>
              <input type='text' required className='w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition' placeholder='e.g. John Doe' value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} />
            </div>
            <div>
              <label className='block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1'>Email</label>
              <input type='email' required className='w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition' placeholder='john@company.com' value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
            </div>
            <div>
              <label className='block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1'>Password</label>
              <input type='text' required className='w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition' placeholder='Set password' value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} />
            </div>
            <div>
              <label className='block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1'>Role</label>
              <div className='grid grid-cols-2 gap-4'>
                <button type='button' onClick={() => setNewUser({ ...newUser, role: "staff" })} className={`p-3 rounded-xl border text-sm font-medium transition ${newUser.role === "staff" ? "bg-blue-50 border-blue-500 text-blue-700" : "bg-white border-gray-200 text-gray-600"}`}>
                  Staff
                </button>
                <button type='button' onClick={() => setNewUser({ ...newUser, role: "admin" })} className={`p-3 rounded-xl border text-sm font-medium transition ${newUser.role === "admin" ? "bg-blue-50 border-blue-500 text-blue-700" : "bg-white border-gray-200 text-gray-600"}`}>
                  Admin
                </button>
              </div>
            </div>
            <button type='submit' disabled={regLoading} className='w-full py-4 bg-gray-900 text-white rounded-xl font-bold shadow-lg hover:bg-gray-800 mt-4 flex items-center justify-center'>
              {regLoading ? (
                <>
                  <UploadCloud size={20} className='animate-bounce mr-2' /> Processing...
                </>
              ) : (
                "Create User"
              )}
            </button>
          </form>
        </div>
      )}

      {/* --- EDIT USER MODAL --- */}
      {isEditModalOpen && (
        <div className='fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4'>
          <div className='bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl animate-fade-in-up'>
            <div className='flex justify-between items-center mb-6'>
              <h3 className='text-xl font-bold text-gray-900'>Edit Profile</h3>
              <button onClick={() => setIsEditModalOpen(false)} className='p-2 bg-gray-100 rounded-full hover:bg-gray-200'>
                <X size={20} />
              </button>
            </div>

            <div className='space-y-4'>
              <div className='flex flex-col items-center mb-4'>
                <div className='relative w-20 h-20 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden group hover:border-blue-500 transition cursor-pointer'>
                  {imagePreview ? <img src={imagePreview} className='w-full h-full object-cover' /> : <Camera className='text-gray-400' size={24} />}
                  <input type='file' accept='image/*' onChange={handleImageChange} className='absolute inset-0 opacity-0 cursor-pointer' />
                </div>
                <p className='text-xs text-gray-500 mt-2'>Tap to change photo</p>
              </div>

              <div>
                <label className='block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1'>Full Name</label>
                <input type='text' className='w-full p-3 bg-gray-50 border border-gray-200 rounded-xl' value={editingUser?.name} onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })} />
              </div>

              <div>
                <label className='block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1'>Role</label>
                <div className='grid grid-cols-2 gap-4'>
                  <button type='button' onClick={() => setEditingUser({ ...editingUser, role: "staff" })} className={`p-3 rounded-xl border text-sm font-medium transition ${editingUser?.role === "staff" ? "bg-blue-50 border-blue-500 text-blue-700" : "bg-white border-gray-200 text-gray-600"}`}>
                    Staff
                  </button>
                  <button type='button' onClick={() => setEditingUser({ ...editingUser, role: "admin" })} className={`p-3 rounded-xl border text-sm font-medium transition ${editingUser?.role === "admin" ? "bg-blue-50 border-blue-500 text-blue-700" : "bg-white border-gray-200 text-gray-600"}`}>
                    Admin
                  </button>
                </div>
              </div>

              <button onClick={handleUpdateUser} disabled={regLoading} className='w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg mt-4 flex items-center justify-center'>
                {regLoading ? (
                  "Saving..."
                ) : (
                  <>
                    <Save size={18} className='mr-2' /> Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
