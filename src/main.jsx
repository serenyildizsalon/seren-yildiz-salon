
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import "./style.css";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey)
    : null;

function App() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [recovery, setRecovery] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [profile, setProfile] = useState(null);
  const [page, setPage] = useState("appointments");
  const [appointments, setAppointments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    service: "",
    staff: "",
    date: "",
    time: "",
    notes: ""
  });

  useEffect(() => {
    if (!supabase) {
      setMessage("Supabase bağlantı ayarları bulunamadı.");
      setLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        if (!mounted) return;
        setSession(currentSession);
        if (event === "PASSWORD_RECOVERY") setRecovery(true);
      }
    );

    if (window.location.hash.includes("type=recovery")) {
      setRecovery(true);
    }

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (session) loadProfile();
  }, [session]);

  async function loadProfile() {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();

    if (error) {
      setMessage("Profil bilgisi alınamadı: " + error.message);
      return;
    }

    if (!data.is_active) {
      await supabase.auth.signOut();
      setMessage("Hesabınız aktif değil. Yöneticiyle görüşün.");
      return;
    }

    setProfile(data);
    loadData();
  }

  async function loadData() {
    const [a, c, s, p] = await Promise.all([
      supabase.from("appointments")
        .select("*, customers(full_name, phone), services(name), profiles:staff_id(full_name)")
        .order("starts_at", { ascending: true }),
      supabase.from("customers").select("*").order("full_name"),
      supabase.from("services").select("*").eq("is_active", true),
      supabase.from("profiles").select("id, full_name, role")
        .eq("is_active", true)
    ]);

    if (!a.error) setAppointments(a.data || []);
    if (!c.error) setCustomers(c.data || []);
    if (!s.error) setServices(s.data || []);
    if (!p.error) setStaff(p.data || []);
  }

  async function login(e) {
    e.preventDefault();
    setBusy(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });

    setBusy(false);
    if (error) setMessage("Giriş yapılamadı: " + error.message);
  }

  async function resetPassword() {
    if (!email.trim()) {
      setMessage("Önce e-posta adresinizi yazın.");
      return;
    }

    setBusy(true);
    setMessage("");

    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo: window.location.origin }
    );

    setBusy(false);
    setMessage(
      error
        ? "E-posta gönderilemedi: " + error.message
        : "Şifre yenileme bağlantısı e-posta adresinize gönderildi."
    );
  }

  async function saveNewPassword(e) {
    e.preventDefault();
    if (newPassword.length < 8) {
      setMessage("Yeni şifreniz en az 8 karakter olmalı.");
      return;
    }

    setBusy(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    setBusy(false);

    if (error) {
      setMessage("Şifre değiştirilemedi: " + error.message);
    } else {
      setRecovery(false);
      setNewPassword("");
      setMessage("Şifreniz değiştirildi. Şimdi giriş yapabilirsiniz.");
      await supabase.auth.signOut();
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    setProfile(null);
    setMessage("");
  }

  async function addAppointment(e) {
    e.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      let customer = customers.find(
        x => x.phone === form.phone.trim()
      );

      if (!customer) {
        const { data, error } = await supabase
          .from("customers")
          .insert({
            full_name: form.name.trim(),
            phone: form.phone.trim(),
            created_by: session.user.id
          })
          .select()
          .single();

        if (error) throw error;
        customer = data;
      }

      const selectedService = services.find(
        x => x.id === form.service
      );

      const selectedStaff = staff.find(
        x => x.id === form.staff
      );

      if (!selectedService || !selectedStaff) {
        throw new Error("Hizmet ve personel seçmelisiniz.");
      }

      const start = new Date(`${form.date}T${form.time}`);
      const end = new Date(
        start.getTime() + (selectedService.duration_minutes || 30) * 60000
      );

      const { error } = await supabase.from("appointments").insert({
        customer_id: customer.id,
        staff_id: selectedStaff.id,
        service_id: selectedService.id,
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
        price: selectedService.price || 0,
        status: "scheduled",
        notes: form.notes,
        created_by: session.user.id
      });

      if (error) throw error;

      setForm({
        name: "",
        phone: "",
        service: "",
        staff: "",
        date: "",
        time: "",
        notes: ""
      });
      setMessage("Randevu kaydedildi.");
      await loadData();
    } catch (error) {
      setMessage("Kayıt yapılamadı: " + error.message);
    }

    setBusy(false);
  }

  if (loading) return <main className="app"><h2>Yükleniyor...</h2></main>;

  if (recovery) {
    return (
      <main className="app">
        <section className="panel">
          <h1>Yeni Şifre Belirle</h1>
          <form onSubmit={saveNewPassword}>
            <input
              type="password"
              placeholder="Yeni şifreniz"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
            />
            <button disabled={busy}>Şifremi Değiştir</button>
          </form>
          <p>{message}</p>
        </section>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="app">
        <section className="panel">
          <div className="logo">SY</div>
          <p>SEREN YILDIZ KUAFÖR & GÜZELLİK SALONU</p>
          <h1>Salon Yönetimi</h1>
          <p>Devam etmek için hesabınıza giriş yapın.</p>

          <form onSubmit={login}>
            <label>E-posta</label>
            <input
              type="email"
              placeholder="E-posta adresiniz"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <label>Şifre</label>
            <input
              type="password"
              placeholder="Şifreniz"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            <button disabled={busy}>
              {busy ? "Bekleyin..." : "Giriş Yap"}
            </button>
          </form>

          <button className="secondary" onClick={resetPassword} disabled={busy}>
            Şifremi Unuttum
          </button>
          {message && <p className="message">{message}</p>}
        </section>
      </main>
    );
  }

  if (!profile) {
    return <main className="app"><p>{message || "Profil yükleniyor..."}</p></main>;
  }

  return (
    <main className="app">
      <header className="top">
        <div className="logo">SY</div>
        <div>
          <strong>Seren Yıldız</strong>
          <small>Kuaför & Güzellik Salonu</small>
        </div>
        <button className="secondary" onClick={logout}>Çıkış</button>
      </header>

      <nav className="nav">
        <button onClick={() => setPage("appointments")}>Randevular</button>
        <button onClick={() => setPage("customers")}>Müşteriler</button>
        {profile.role === "admin" &&
          <button onClick={() => setPage("finance")}>Kasa</button>}
      </nav>

      {page === "appointments" && (
        <section className="panel">
          <h2>Yeni Randevu</h2>
          <form onSubmit={addAppointment}>
            <input placeholder="Müşteri adı" value={form.name}
              onChange={e => setForm({...form, name:e.target.value})} required />
            <input placeholder="Telefon" value={form.phone}
              onChange={e => setForm({...form, phone:e.target.value})} required />
            <select value={form.service}
              onChange={e => setForm({...form, service:e.target.value})} required>
              <option value="">Hizmet seçin</option>
              {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={form.staff}
              onChange={e => setForm({...form, staff:e.target.value})} required>
              <option value="">Personel seçin</option>
              {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
            <input type="date" value={form.date}
              onChange={e => setForm({...form, date:e.target.value})} required />
            <input type="time" value={form.time}
              onChange={e => setForm({...form, time:e.target.value})} required />
            <textarea placeholder="Not" value={form.notes}
              onChange={e => setForm({...form, notes:e.target.value})} />
            <button disabled={busy}>Randevuyu Kaydet</button>
          </form>

          <h2>Randevu Listesi</h2>
          {appointments.map(a => (
            <article className="item" key={a.id}>
              <strong>{a.customers?.full_name || "Müşteri"}</strong>
              <span>{a.services?.name || "Hizmet"}</span>
              <span>{new Date(a.starts_at).toLocaleString("tr-TR")}</span>
            </article>
          ))}
        </section>
      )}

      {page === "customers" && (
        <section className="panel">
          <h2>Müşteriler</h2>
          {customers.map(c => (
            <article className="item" key={c.id}>
              <strong>{c.full_name}</strong>
              <span>{c.phone}</span>
            </article>
          ))}
        </section>
      )}

      {page === "finance" && profile.role === "admin" && (
        <section className="panel">
          <h2>Kasa</h2>
          <p>Kasa kayıtları bu bölümde görüntülenecek.</p>
        </section>
      )}

      {message && <p className="message">{message}</p>}
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
