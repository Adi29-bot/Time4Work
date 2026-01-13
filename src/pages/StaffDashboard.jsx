import { useState, useEffect } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isAfter, getDay } from "date-fns";
import { ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import { useFirebase } from "../context/firebase";
import EntryModal from "../components/EntryModal";
import Lottie from "lottie-react";
import treasureData from "../assets/treasure.json";

export default function StaffDashboard() {
  const { user, userData, logoutUser, getMyMonthData } = useFirebase();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateDetails, setSelectedDateDetails] = useState(null);

  const [monthData, setMonthData] = useState(null);
  const [loading, setLoading] = useState(true);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await getMyMonthData(currentDate);
        setMonthData(data);
      } catch (error) {
        console.error("Error fetching month data:", error);
      }
      setLoading(false);
    };
    fetchData();
  }, [currentDate, user]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const totalHours = monthData?.totalHours || 0;
  const startDayIndex = getDay(monthStart);

  const handleDayClick = (day, entries) => {
    if (isAfter(day, new Date())) {
      alert("You cannot add entries for future dates.");
      return;
    }
    setSelectedDateDetails({ date: day, existingEntries: entries || [] });
  };

  return (
    <div className='min-h-screen bg-gray-50 pb-20 font-sans'>
      {/* HEADER */}
      <div className='bg-white p-6 rounded-b-3xl shadow-sm'>
        <div className='flex justify-between items-start'>
          <div>
            <h2 className='text-2xl font-bold text-gray-800 leading-tight'>
              {greeting}, <span className='text-blue-600'>{userData?.name || "Staff"}</span>
            </h2>
          </div>
          <button onClick={logoutUser} className='text-sm text-red-500 font-medium bg-white border border-red-100 px-4 py-2 rounded-full hover:bg-red-50 transition'>
            <LogOut size={20} />
          </button>
        </div>

        <div className='mt-6 flex items-center bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-2xl border border-yellow-100 shadow-sm'>
          <div className='w-20 h-20 mr-4 flex-shrink-0'>{treasureData ? <Lottie animationData={treasureData} loop={true} /> : <div className='text-4xl'>💰</div>}</div>
          <div>
            <p className='text-xs text-yellow-800 font-bold uppercase tracking-wide'>Monthly Progress</p>
            <p className='text-3xl font-extrabold text-yellow-900'>
              {totalHours.toFixed(1)} <span className='text-sm font-medium'>Hrs</span>
            </p>
          </div>
        </div>
      </div>

      {/* CONTROLS */}
      <div className='flex items-center justify-between px-6 mt-8 mb-6'>
        <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className='p-2 bg-white rounded-full shadow hover:bg-gray-50'>
          <ChevronLeft size={20} />
        </button>
        <h3 className='text-xl font-bold text-gray-800'>{format(currentDate, "MMMM yyyy")}</h3>
        <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className='p-2 bg-white rounded-full shadow hover:bg-gray-50'>
          <ChevronRight size={20} />
        </button>
      </div>

      {/* GRID */}
      <div className='px-4 mb-8'>
        <div className='grid grid-cols-7 gap-2 mb-2'>
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <div key={`${d}-${i}`} className='text-center text-xs font-bold text-gray-400'>
              {d}
            </div>
          ))}
        </div>

        <div className='grid grid-cols-7 gap-2'>
          {Array.from({ length: startDayIndex }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}

          {daysInMonth.map((day) => {
            const dateKey = format(day, "yyyy-MM-dd");
            const dayEntries = monthData?.entries?.[dateKey];
            const hasEntries = dayEntries && dayEntries.length > 0;
            const isToday = isSameDay(day, new Date());
            const isFuture = isAfter(day, new Date());

            return (
              <button
                key={day.toString()}
                onClick={() => handleDayClick(day, dayEntries)}
                disabled={isFuture}
                className={`
                  h-14 rounded-xl flex flex-col items-center justify-center text-sm font-semibold transition-all relative
                  ${!isSameMonth(day, currentDate) ? "opacity-30" : ""}
                  ${isToday ? "border-2 border-blue-500" : ""}
                  ${isFuture ? "opacity-20 cursor-not-allowed bg-gray-100" : "hover:bg-gray-50"}
                  ${hasEntries ? "bg-green-100 text-green-900" : "bg-white text-gray-400 shadow-sm"}
                `}
              >
                <span>{format(day, "d")}</span>
                {hasEntries && <span className='w-1.5 h-1.5 bg-green-500 rounded-full mt-1'></span>}
              </button>
            );
          })}
        </div>
      </div>

      {selectedDateDetails && (
        <EntryModal
          date={selectedDateDetails.date}
          existingEntries={selectedDateDetails.existingEntries}
          onClose={() => {
            setSelectedDateDetails(null);
            getMyMonthData(currentDate).then(setMonthData);
          }}
        />
      )}
    </div>
  );
}
