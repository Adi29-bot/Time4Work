import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFirebase } from "../context/firebase"; // Importing from your context
import { User, Lock, CheckSquare } from "lucide-react"; // Icons

export default function Register() {
  const firebase = useFirebase();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Handle Login
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // We use the function from your firebase.jsx context
      console.log("Signing up a user...");
      await firebase.signupUserWithEmailAndPassword(name, email, password, role);
      console.log("Signed up...");
      // If successful, redirect to dashboard (based on role logic in App.jsx)
      navigate("/staff");
    } catch (err) {
      console.error(err);
      setError("Invalid username or password");
    } finally {
      setLoading(false);
    }
  };
  console.log(firebase);
  return (
    // MAIN CONTAINER: Holds the background image
    <div
      className='relative min-h-screen w-full bg-cover bg-center flex items-center justify-center font-sans'
      style={{
        // Placeholder Skyscraper image. Replace this URL with your local file or own URL
        backgroundImage: "url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop')",
      }}
    >
      {/* OVERLAY: This creates the Orange/Yellow tint over the image */}
      <div className='absolute inset-0 bg-gradient-to-br from-yellow-600/90 to-yellow-800/90 mix-blend-multiply'></div>

      {/* CONTENT CARD */}
      <div className='relative z-10 w-full max-w-sm px-6 py-10 flex flex-col items-center text-white'>
        {/* LOGO SECTION */}
        <div className='mb-6 flex flex-col items-center'>
          <div className='border-4 border-white p-2 mb-2'>
            <CheckSquare size={48} strokeWidth={3} />
          </div>
          <h1 className='text-3xl font-bold tracking-widest uppercase'>Timesheet</h1>
          <p className='text-sm italic opacity-90 mt-1'>Welcome to Timesheet</p>
        </div>

        <h2 className='text-2xl font-medium mb-8'>Sign in</h2>

        {/* ERROR MESSAGE */}
        {error && <div className='bg-red-500/80 text-white text-sm p-2 rounded-lg mb-4 w-full text-center'>{error}</div>}

        {/* LOGIN FORM */}
        <form onSubmit={handleSubmit} className='w-full space-y-5'>
          {/* Email/Username Input */}
          <div className='relative'>
            <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
              <User className='text-yellow-500' size={20} />
            </div>
            <input type='email' required placeholder='Username (Email)' value={email} onChange={(e) => setEmail(e.target.value)} className='block w-full pl-12 pr-4 py-3 bg-white text-gray-900 placeholder-gray-400 rounded-full focus:outline-none focus:ring-2 focus:ring-yellow-400 transition' />
          </div>

          {/* Password Input */}
          <div className='relative'>
            <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
              <Lock className='text-yellow-500' size={20} />
            </div>
            <input type='password' required placeholder='Password' value={password} onChange={(e) => setPassword(e.target.value)} className='block w-full pl-12 pr-4 py-3 bg-white text-gray-900 placeholder-gray-400 rounded-full focus:outline-none focus:ring-2 focus:ring-yellow-400 transition' />
          </div>

          {/* Submit Button */}
          <button type='submit' disabled={loading} className='w-full bg-[#EBCB4B] hover:bg-[#d6b73d] text-white font-bold py-3 px-4 rounded-full uppercase tracking-wider shadow-lg transform active:scale-95 transition duration-200 mt-4 disabled:opacity-70'>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {/* Footer Links (Disabled as per request, but keeping layout spacing) */}
        <div className='mt-8 h-4'></div>
      </div>
    </div>
  );
}
