import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useFirebase } from "../context/firebase";
import { Lock, ClipboardList, Mail } from "lucide-react";

export default function Login() {
  const firebase = useFirebase();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (firebase.isLoggedIn && firebase.userData) {
      if (firebase.userData.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/staff");
      }
    }
  }, [firebase, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await firebase.signinUserWithEmailAndPass(email, password);
      navigate("/staff");
    } catch (err) {
      console.error(err);
      setError("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='relative min-h-screen w-full bg-cover bg-center flex items-center justify-center font-sans' style={{ backgroundImage: "url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2000&auto=format&fit=crop')" }}>
      <div className='absolute inset-0 bg-gradient-to-br from-yellow-600/90 to-yellow-800/90 mix-blend-multiply'></div>

      <div className='relative z-10 w-full max-w-sm px-6 py-10 flex flex-col items-center text-white'>
        <div className='mb-6 flex flex-col items-center'>
          <ClipboardList size={64} strokeWidth={1.5} className='mb-4 opacity-90' />

          <h1 className='text-3xl font-bold tracking-widest uppercase'>Timesheet</h1>
          <p className='text-sm italic opacity-90 mt-1'>Welcome to Time4Work</p>
        </div>

        {error && <div className='bg-red-500/80 text-white text-sm p-2 rounded-lg mb-4 w-full text-center'>{error}</div>}

        <form onSubmit={handleSubmit} className='w-full space-y-5'>
          <div className='relative'>
            <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
              <Mail className='text-yellow-500' size={20} />
            </div>
            <input type='email' required placeholder='Username (Email)' value={email} onChange={(e) => setEmail(e.target.value)} className='block w-full pl-12 pr-4 py-3 bg-white text-gray-900 rounded-full focus:outline-none focus:ring-2 focus:ring-yellow-400' />
          </div>

          <div className='relative'>
            <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
              <Lock className='text-yellow-500' size={20} />
            </div>
            <input type='password' required placeholder='Password' value={password} onChange={(e) => setPassword(e.target.value)} className='block w-full pl-12 pr-4 py-3 bg-white text-gray-900 rounded-full focus:outline-none focus:ring-2 focus:ring-yellow-400' />
          </div>

          <button type='submit' disabled={loading} className='w-full bg-[#EBCB4B] hover:bg-[#d6b73d] text-white font-bold py-3 px-4 rounded-full uppercase tracking-wider shadow-lg mt-4 transition'>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
