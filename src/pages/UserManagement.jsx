import { useState } from "react";
import supabase from "../lib/supabaseClient";

const UserManagement = () => {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("employee");

  // 🔥 auto generate password
  const generatePassword = () => {
    return Math.random().toString(36).slice(-8);
  };

  const addUser = async () => {
  if (!email) return alert("Enter email");

  // IMPORTANT: signing up a new user with supabase.auth.signUp()
  // will replace the current session in the browser. That is why
  // the admin account immediately appears to become the new employee.
  //
  // Use a server-side admin/create-user endpoint or ask the employee
  // to sign up themselves with the same email.

  // 🔥 Save role only
  const { error: roleError } = await supabase
    .from("user_roles")
    .insert([{ email, role }]);

  if (roleError) {
    alert(roleError.message);
    return;
  }

  alert(
    `User role saved!\nEmail: ${email}\nRole: ${role}\n\n` +
      "The user must still sign up or be created via a backend admin flow."
  );
};

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">User Management</h2>

      <input
        placeholder="Email"
        className="border p-2 mr-2"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <select
        className="border p-2 mr-2"
        value={role}
        onChange={(e) => setRole(e.target.value)}
      >
        <option value="admin">Admin</option>
        <option value="manager">Manager</option>
        <option value="employee">Employee</option>
      </select>

      <button
        onClick={addUser}
        className="bg-blue-500 text-white px-4 py-2"
      >
        Create User
      </button>
    </div>
  );
};

export default UserManagement;





















