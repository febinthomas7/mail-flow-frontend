import { Link } from "react-router-dom";
import { AlertTriangle, Search } from "lucide-react";
import { useEffect, useState } from "react";

const NotFound = () => {
  const [countdown, setCountdown] = useState(10);
  const [query, setQuery] = useState("");

  // Auto redirect after 10s
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    if (countdown === 0) {
      window.location.href = "/";
    }

    return () => clearInterval(timer);
  }, [countdown]);

  // Google Search handler
  const handleSearch = () => {
    if (query.trim() !== "") {
      const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(
        query
      )}`;
      window.open(googleUrl, "_blank");
    } else {
      alert("Please enter something to search.");
    }
  };

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen text-center px-6 
                 bg-gradient-to-r from-[#0b4f4a] via-[#1a756f] to-[#2a9b94] transition"
    >
      {/* Logo-like warning icon */}
      <AlertTriangle className="w-16 h-16 mb-4 text-white" />

      {/* 404 Title */}
      <h1 className="text-5xl font-semibold mb-2 text-white drop-shadow-lg">
        404 Not Found
      </h1>

      <p className="mb-8 text-gray-200">
        The page you’re looking for doesn’t exist.
      </p>

      {/* Google-style search bar */}
      <div
        className="w-full max-w-2xl flex items-center rounded-full shadow-md hover:shadow-lg px-4 py-2 transition bg-white"
      >
        <Search className="w-5 h-5 mr-3 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Search Something..."
          className="flex-1 bg-transparent outline-none text-lg text-gray-800"
        />
      </div>

      {/* Google-style buttons */}
      <div className="flex gap-4 mt-6">
        <button
          onClick={handleSearch}
          className="px-5 py-2 rounded-md text-sm transition bg-white text-gray-700 hover:bg-gray-100"
        >
          Search
        </button>
        <button
          onClick={() => (window.location.href = "/")}
          className="px-5 py-2 rounded-md text-sm transition bg-white text-gray-700 hover:bg-gray-100"
        >
          I’m Feeling Lucky
        </button>
      </div>

      {/* Quick Links */}
      <div className="mt-8 flex gap-6 text-sm text-white">
        <Link to="/" className="hover:underline">
          Home
        </Link>
        <Link to="/about" className="hover:underline">
          About
        </Link>
        <Link to="/contact" className="hover:underline">
          Contact
        </Link>
      </div>

      {/* Auto Redirect Notice */}
      <p className="mt-6 text-xs text-gray-200">
        Redirecting to{" "}
        <Link to="/" className="text-white font-semibold underline">
          Home
        </Link>{" "}
        in {countdown}s...
      </p>
    </div>
  );
};

export default NotFound;
