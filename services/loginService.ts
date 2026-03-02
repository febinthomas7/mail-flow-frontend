const backendUrl = import.meta.env.VITE_BASE_URL;

export const handleLogin = async (userId: string, userPassword: string) => {
  try {
    const response = await fetch(`${backendUrl}/api/login/admin`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: userId, password: userPassword }),
    });

    const data = await response.json();

    // if (data.success) {
    //   // No need to do localStorage.setItem()!
    //   // The browser already saved the cookie from the response headers.
    //   window.location.href = "/send-email";
    // } else {
    //   alert(data.message);
    // }
    return data;
  } catch (error) {
    console.error("Login request failed", error);
  }
};
