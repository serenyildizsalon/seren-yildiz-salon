import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import {
  CalendarDays, Users, Package, Scissors, Wallet, LayoutDashboard,
  Plus, Search, Menu, X, Clock, TrendingUp, Settings, LogOut,
  ChevronRight, Phone, CheckCircle2, Loader2
} from "lucide-react";
import "./style.css";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [appointments, setAppointments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);
  const [packages, setPackages] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [login, setLogin] = useState({ email: "", password: "" });
  const [authMode, setAuthMode] = useState("login"); // login | forgot | recovery
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", service_id: "", date: "", time: "", staff_id: "", price: "", notes: "" });

  useEffect(() => {
    if (!supabase) { setError("Supabase baÄlantÄ± bilgileri bulunamadÄ±. Vercel ortam deÄiÅkenlerini kontrol edin."); setLoading(false); return; }
    // Supabase recovery links return to the deployed site, never localhost.
    if (window.location.hash.includes("type=recovery")) setAuthMode("recovery");
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) setError(error.message);
      setSession(data.session);
      if (!data.session) setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "PASSWORD_RECOVERY") setAuthMode("recovery");
      setSession(nextSession);
      if (!nextSession) { setProfile(null); setAppointments([]); setCustomers([]); setServices([]); setLoading(false); }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => { if (session?.user?.id) loadData(); }, [session?.user?.id]);

  async function loadData() {
    setLoading(true); setError("");
    const userId = session.user.id;
    const [p, a, c, s, pk] = await Promise.all([
      supabase.from("profiles").select("id,full_name,role,is_active,username").eq("id", userId).maybeSingle(),
      supabase.from("appointments").select("id,customer_id,staff_id,service_id,starts_at,ends_at,price,status,notes,customers(full_name,phone),services(name),profiles!appointments_staff_id_fkey(full_name)").order("starts_at", { ascending: true }),
      supabase.from("customers").select("id,full_name,phone,notes,created_at").order("full_name"),
      supabase.from("services").select("id,name,category,price,duration_minutes,is_active").eq("is_active", true).order("category").order("name"),
      supabase.from("packages").select("id,name,total_sessions,price,is_active").eq("is_active", true).order("name")
    ]);
    const firstError = [p,a,c,s,pk].find(x => x.error)?.error;
    if (firstError) setError(firstError.message);
    if (p.data) setProfile(p.data);
    setAppointments(a.data || []); setCustomers(c.data || []); setServices(s.data || []); setPackages(pk.data || []);
    setLoading(false);
  }

  async function signIn(e) {
    e.preventDefault(); setError(""); setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: login.email.trim(), password: login.password });
    if (error) { setError(error.message); setLoading(false); }
  }
  async function sendPasswordReset(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const email = login.email.trim();
    if (!email) {
      setError("Ãnce e-posta adresini yaz.");
      setLoading(false);
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin
    });
    if (error) setError(error.message);
    else setResetEmailSent(true);
    setLoading(false);
  }

  async function updatePassword(e) {
    e.preventDefault();
    setError("");
    if (newPassword.length < 8) {
      setError("Yeni Åifre en az 8 karakter olmalÄ±.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setAuthMode("login");
    setNewPassword("");
    setLogin(current => ({ ...current, password: "" }));
    setError("Åifren gÃ¼ncellendi. Yeni Åifrenle giriÅ yapabilirsin.");
    await supabase.auth.signOut();
    setLoading(false);
  }

  async function signOut() { await supabase.auth.signOut(); }

  async function addAppointment(e) {
    e.preventDefault(); setError("");
    if (!form.name.trim() || !form.date || !form.time || !form.service_id) { setError("Ad, hizmet, tarih ve saat alanlarÄ±nÄ± doldurun."); return; }
    setSaving(true);
    try {
      let customer = customers.find(c => form.phone.trim() && c.phone === form.phone.trim());
      if (!customer) {
        const { data, error: customerError } = await supabase.from("customers").insert({
          full_name: form.name.trim(), phone: form.phone.trim() || null,
          created_by: session.user.id, notes: null
        }).select("id,full_name,phone,notes,created_at").single();
        if (customerError) throw customerError;
        customer = data;
      }
      const service = services.find(s => s.id === form.service_id);
      const start = new Date(`${form.date}T${form.time}:00`);
      const end = new Date(start.getTime() + (service?.duration_minutes || 60) * 60000);
      const { error: appointmentError } = await supabase.from("appointments").insert({
        customer_id: customer.id,
        staff_id: form.staff_id || profile?.id || session.user.id,
        service_id: form.service_id,
        starts_at: start.toISOString(), ends_at: end.toISOString(),
        price: form.price === "" ? (service?.price || 0) : Number(form.price),
        status: "scheduled", notes: form.notes.trim() || null,
        created_by: session.user.id
      });
      if (appointmentError) throw appointmentError;
      setShowForm(false); setForm({ name:"", phone:"", service_id:"", date:"", time:"", staff_id:"", price:"", notes:"" });
      await loadData();
    } catch (err) { setError(err.message || "KayÄ±t sÄ±rasÄ±nda hata oluÅtu."); }
    finally { setSaving(false); }
  }

  const isAdmin = ["admin", "owner", "manager", "yÃ¶netici"].includes(String(profile?.role || "").toLowerCase());
  const today = new Date().toLocaleDateString("en-CA");
  const todayAppointments = appointments.filter(a => a.starts_at?.slice(0,10) === today);
  const visibleCustomers = customers.filter(c => (c.full_name || "").toLocaleLowerCase("tr").includes(search.toLocaleLowerCase("tr")) || (c.phone || "").includes(search));
  const titles = { dashboard:"Genel BakÄ±Å", appointments:"Randevu YÃ¶netimi", customers:"MÃ¼Återi KayÄ±tlarÄ±", packages:"Paket ve Seans Takibi", services:"Hizmetler", finance:"Kasa ve Finans" };
  const menu = [
    { id:"dashboard", name:"Genel BakÄ±Å", icon:LayoutDashboard },
    { id:"appointments", name:"Randevular", icon:CalendarDays },
    { id:"customers", name:"MÃ¼Återiler", icon:Users },
    { id:"packages", name:"Paket Takibi", icon:Package },
    { id:"services", name:"Hizmetler", icon:Scissors },
    ...(isAdmin ? [{ id:"finance", name:"Kasa ve Finans", icon:Wallet }] : [])
  ];

  if (!supabase) return <div className="auth-wrap"><div className="auth-card"><div className="brand-mark">SY</div><h1>BaÄlantÄ± ayarÄ± eksik</h1><p>Vercel'de VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY tanÄ±mlÄ± olmalÄ±.</p></div></div>;
  if (!session || authMode === "recovery") return <div className="auth-wrap"><form className="auth-card" onSubmit={authMode === "forgot" ? sendPasswordReset : authMode === "recovery" ? updatePassword : signIn}>
    <div className="brand-mark">SY</div><div className="eyebrow">SEREN YILDIZ â¢ SALON YÃNETÄ°MÄ°</div>
    {authMode === "recovery" ? <>
      <h1>Yeni Åifre Belirle</h1><p>HesabÄ±n iÃ§in yeni bir Åifre oluÅtur.</p>
      <label>Yeni Åifre</label><input type="password" required minLength={8} autoComplete="new-password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="En az 8 karakter"/>
      <button className="gold-button submit-button" disabled={loading}>{loading ? "Kaydediliyorâ¦" : "Åifremi GÃ¼ncelle"}</button>
    </> : authMode === "forgot" ? <>
      <h1>Åifremi Unuttum</h1><p>Åifre sÄ±fÄ±rlama baÄlantÄ±sÄ±nÄ± e-posta adresine gÃ¶nderelim.</p>
      <label>E-posta</label><input type="email" required autoComplete="email" value={login.email} onChange={e=>{setLogin({...login,email:e.target.value});setResetEmailSent(false);}} placeholder="E-posta adresin"/>
      <button className="gold-button submit-button" disabled={loading}>{loading ? "GÃ¶nderiliyorâ¦" : "SÄ±fÄ±rlama BaÄlantÄ±sÄ± GÃ¶nder"}</button>
      {resetEmailSent && <p className="success-text">BaÄlantÄ± gÃ¶nderildi. E-postanÄ± ve spam klasÃ¶rÃ¼nÃ¼ kontrol et.</p>}
      <button type="button" className="text-button auth-back" onClick={()=>{setAuthMode("login");setError("");}}>GiriÅ ekranÄ±na dÃ¶n</button>
    </> : <>
      <h1>GiriÅ Yap</h1><p>Devam etmek iÃ§in hesabÄ±nla giriÅ yap.</p>
      <label>E-posta</label><input type="email" required autoComplete="username" value={login.email} onChange={e=>setLogin({...login,email:e.target.value})} placeholder="E-posta adresin"/>
      <label>Åifre</label><input type="password" required autoComplete="current-password" value={login.password} onChange={e=>setLogin({...login,password:e.target.value})} placeholder="Åifren"/>
      <button className="gold-button submit-button" disabled={loading}>{loading ? "Kontrol ediliyorâ¦" : "GiriÅ Yap"}</button>
      <button type="button" className="text-button auth-back" onClick={()=>{setAuthMode("forgot");setError("");setResetEmailSent(false);}}>Åifremi unuttum</button>
    </>}
    {error && <p className={error.includes("gÃ¼ncellendi") ? "success-text" : "error-text"}>{error}</p>}
  </form></div>;
  if (loading) return <div className="auth-wrap"><div className="auth-card"><Loader2 className="spin"/> Veriler yÃ¼kleniyorâ¦</div></div>;

  return <div className="app">
    <aside className={`sidebar ${mobileMenu ? "open" : ""}`}>
      <div className="brand"><div className="brand-mark">SY</div><div><strong>SEREN YILDIZ</strong><small>SALON YÃNETÄ°MÄ°</small></div><button className="close-menu" onClick={()=>setMobileMenu(false)}><X/></button></div>
      <div className="menu-label">MENÃ</div>
      {menu.map(item=>{const Icon=item.icon;return <button key={item.id} className={`nav-item ${page===item.id?"active":""}`} onClick={()=>{setPage(item.id);setMobileMenu(false);}}><Icon size={19}/>{item.name}{page===item.id&&<ChevronRight size={16}/>}</button>})}
      <div className="sidebar-bottom"><div className="profile"><div className="avatar">{(profile?.full_name||"SY").slice(0,1)}</div><div><strong>{profile?.full_name||profile?.username||"KullanÄ±cÄ±"}</strong><small>{profile?.role||"Personel"}</small></div><button className="icon-button" onClick={signOut} title="ÃÄ±kÄ±Å yap"><LogOut size={18}/></button></div><small className="version">SEREN YILDIZ SALON â¢ 1.0</small></div>
    </aside>
    {mobileMenu&&<div className="overlay" onClick={()=>setMobileMenu(false)}/>}
    <main className="main"><header className="topbar"><button className="menu-button" onClick={()=>setMobileMenu(true)}><Menu/></button><div className="breadcrumb">Seren YÄ±ldÄ±z <span>/</span> {titles[page]}</div><div className="top-actions"><button className="icon-button" onClick={loadData}><Clock size={18}/></button><div className="top-avatar">SY</div></div></header>
      <div className="content"><div className="page-heading"><div><div className="eyebrow">SALON YÃNETÄ°M PANELÄ°</div><h1>{titles[page]}</h1><p>Salonunun gÃ¼nlÃ¼k iÅlemlerini buradan yÃ¶netebilirsin.</p></div>{(page==="dashboard"||page==="appointments")&&<button className="gold-button" onClick={()=>setShowForm(true)}><Plus size={18}/> Yeni Randevu</button>}</div>
      {error&&<div className="error-banner">{error}</div>}
      {page==="dashboard"&&<><div className="stats"><div className="stat-card"><div className="stat-icon"><CalendarDays/></div><span>BugÃ¼nkÃ¼ Randevular</span><strong>{todayAppointments.length}</strong><small>BugÃ¼n</small></div><div className="stat-card"><div className="stat-icon"><Users/></div><span>Toplam MÃ¼Återi</span><strong>{customers.length}</strong><small>KayÄ±tlÄ± mÃ¼Återi</small></div><div className="stat-card"><div className="stat-icon"><Package/></div><span>Aktif Paket</span><strong>{packages.length}</strong><small>TanÄ±mlÄ± paket</small></div><div className="stat-card"><div className="stat-icon"><TrendingUp/></div><span>Toplam Randevu</span><strong>{appointments.length}</strong><small>KayÄ±tlÄ± randevu</small></div></div><div className="panel"><div className="panel-heading"><div><h2>GÃ¼nÃ¼n RandevularÄ±</h2><p>BugÃ¼n iÃ§in oluÅturulan randevular</p></div><button className="text-button" onClick={()=>setPage("appointments")}>TÃ¼mÃ¼nÃ¼ gÃ¶r <ChevronRight size={16}/></button></div>{todayAppointments.length===0?<Empty icon={CalendarDays} title="BugÃ¼n iÃ§in randevu yok" desc="Yeni randevu ekleyerek baÅlayabilirsin."/>:todayAppointments.map(a=><AppointmentRow key={a.id} a={a}/>)}</div></>}
      {page==="appointments"&&<div className="panel"><div className="panel-heading"><div><h2>Randevu Listesi</h2><p>VeritabanÄ±ndaki randevular</p></div></div>{appointments.length===0?<Empty icon={CalendarDays} title="HenÃ¼z randevu yok" desc="Yeni Randevu butonunu kullanabilirsin."/>:appointments.map(a=><AppointmentRow key={a.id} a={a}/>)}</div>}
      {page==="customers"&&<div className="panel"><div className="panel-heading"><div><h2>MÃ¼Återi Listesi</h2><p>KayÄ±tlÄ± mÃ¼Återilerin</p></div></div><div className="search-box"><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="MÃ¼Återi araâ¦"/></div>{visibleCustomers.length===0?<Empty icon={Users} title="MÃ¼Återi bulunamadÄ±" desc="Aramana uygun kayÄ±t yok."/>:visibleCustomers.map(c=><div className="customer-row" key={c.id}><div className="avatar">{c.full_name?.slice(0,1)||"?"}</div><div><strong>{c.full_name}</strong><small>{c.phone||"Telefon yok"}</small></div><Phone size={17}/></div>)}</div>}
      {page==="packages"&&<div className="panel"><div className="panel-heading"><div><h2>Paketler</h2><p>TanÄ±mlÄ± aktif paketler</p></div></div>{packages.length===0?<Empty icon={Package} title="Aktif paket bulunamadÄ±" desc="HenÃ¼z aktif paket tanÄ±mlanmamÄ±Å."/>:packages.map(p=><div className="customer-row" key={p.id}><div className="avatar"><Package size={18}/></div><div><strong>{p.name}</strong><small>{p.total_sessions} seans â¢ {Number(p.price||0).toLocaleString("tr-TR")} TL</small></div></div>)}</div>}
      {page==="services"&&<div className="panel"><div className="panel-heading"><div><h2>Salon Hizmetleri</h2><p>VeritabanÄ±ndaki aktif hizmetler</p></div></div><div className="service-grid">{services.map(s=><div className="service-item" key={s.id}><Scissors size={18}/><span>{s.name}</span><small>{Number(s.price||0).toLocaleString("tr-TR")} TL</small></div>)}</div></div>}
      {page==="finance"&&isAdmin&&<div className="panel"><div className="panel-heading"><div><h2>Kasa ve Finans</h2><p>Finans kayÄ±tlarÄ±</p></div></div><p>Finans kayÄ±tlarÄ±nÄ± gÃ¶rÃ¼ntÃ¼lemek iÃ§in veritabanÄ± politikalarÄ± yÃ¶netici rolÃ¼ne gÃ¶re ayrÄ±ca doÄrulanmalÄ±dÄ±r.</p></div>}
      </div>
    </main>
    {showForm&&<div className="modal-backdrop" onClick={()=>setShowForm(false)}><form className="modal" onSubmit={addAppointment} onClick={e=>e.stopPropagation()}><div className="modal-heading"><div><h2>Yeni Randevu</h2><p>MÃ¼Återi ve randevu bilgilerini gir.</p></div><button type="button" className="icon-button" onClick={()=>setShowForm(false)}><X/></button></div><label>MÃ¼Återi adÄ± *</label><input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Ad soyad"/><label>Telefon</label><input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="05xx xxx xx xx"/><label>Hizmet *</label><select required value={form.service_id} onChange={e=>{const s=services.find(x=>x.id===e.target.value);setForm({...form,service_id:e.target.value,price:s?.price??""});}}><option value="">Hizmet seÃ§</option>{services.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select><div className="form-grid"><div><label>Tarih *</label><input required type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></div><div><label>Saat *</label><input required type="time" value={form.time} onChange={e=>setForm({...form,time:e.target.value})}/></div></div><label>Personel ID (isteÄe baÄlÄ±)</label><input value={form.staff_id} onChange={e=>setForm({...form,staff_id:e.target.value})} placeholder="BoÅ bÄ±rakÄ±lÄ±rsa kendi hesabÄ±n"/><label>Fiyat (TL)</label><input type="number" min="0" step="0.01" value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/><label>Not</label><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Randevu notu"/><button className="gold-button submit-button" type="submit" disabled={saving}><CheckCircle2 size={18}/>{saving?"Kaydediliyorâ¦":"Randevuyu Kaydet"}</button></form></div>}
  </div>;
}
function Empty({icon:Icon,title,desc}){return <div className="empty"><Icon size={34}/><strong>{title}</strong><span>{desc}</span></div>}
function AppointmentRow({a}){const date=a.starts_at?new Date(a.starts_at):null;return <div className="appointment-row"><div className="time"><Clock size={16}/>{date?date.toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"}):"â"}</div><div className="appointment-info"><strong>{a.customers?.full_name||"MÃ¼Återi"}</strong><small>{a.services?.name||"Hizmet belirtilmedi"}{a.profiles?.full_name?" â¢ "+a.profiles.full_name:""}</small></div><span className="date-label">{date?date.toLocaleDateString("tr-TR"):""}</span></div>}

createRoot(document.getElementById("root")).render(<App/>);
