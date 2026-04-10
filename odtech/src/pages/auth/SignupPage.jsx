import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import toast from "react-hot-toast";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import { getDefaultRoute } from "../../lib/authRoutes";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("admin");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();

    if (!email || !password || !fullName) {
      return toast.error("Please fill in all fields.");
    }

    if (password.length < 6) {
      return toast.error("Password must be at least 6 characters.");
    }

    setLoading(true);

    try {
      // 1. Create auth user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role,
          },
        },
      });

      if (error) {
        setLoading(false);
        return toast.error(error.message);
      }

      if (!data.user) {
        setLoading(false);
        return toast.error("Signup failed. Please try again.");
      }

      const user = data.user;

      // 2. Try to get session
      const session =
        data.session ?? (await supabase.auth.getSession()).data.session;

      if (!session) {
        toast.success("Check your email to confirm your account.");
        navigate("/login");
        setLoading(false);
        return;
      }

      // 3. Create profile (SAFE with upsert)
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: user.id,
        full_name: fullName,
        email: email,
        role: role,
      });

      if (profileError) {
        console.error("Profile error:", profileError);
        toast.error("Account created but profile setup failed.");
        navigate("/login");
        return;
      }

      toast.success("Account created successfully!");
      navigate(getDefaultRoute({ role }, user), { replace: true });
    } catch (err) {
      console.error("Signup exception:", err);
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-text-primary">
          Create an account
        </h2>
        <p className="text-text-secondary mt-1">
          Get started with O.D DASHBOARD
        </p>
      </div>

      <form onSubmit={handleSignup} className="space-y-4">
        <Input
          label="Full Name"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />

        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <Select
          label="Role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          options={[
            { value: "admin", label: "Admin" },
            { value: "worker", label: "Worker" },
          ]}
        />

        <Button
          type="submit"
          className="w-full"
          loading={loading}
          disabled={loading}
        >
          {loading ? "Creating account..." : "Sign Up"}
        </Button>
      </form>

      <p className="text-center text-sm text-text-muted mt-4">
        Already have an account?{" "}
        <Link to="/login" className="text-primary hover:underline">
          Sign In
        </Link>
      </p>
    </div>
  );
}
