import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import {
  CalendarDays, Users, Package, Scissors, Wallet, LayoutDashboard,
  Plus, Search, Menu, X, Clock, LogOut, RefreshCw, AlertCircle,
  CheckCircle2, LockKeyhole, UserRound, ChevronRight
} from "lucide-react";
import "./style.css";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e) {
    e.preventDefault();
    if (!supabase) return setError("Supabase bağlantı ayarları bulunamadı. Vercel ortam değişkenlerini kontrol edin.");
    setBusy(true); setError("");
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (authError) { setError("Giriş yapılamadı. E-posta ve şifrenizi kontrol edin."); setBusy(false); return; }
    onLogin(data.session);
  }
  return <div className="login-wrap"><form className="login-card" onSubmit={submit}>
    <div className="logo-mark">SY</div><div className="eyebrow">SEREN YILDIZ</div>
    <h1>Salon Yönetimi</h1><p className="muted">Devam etmek için hesabınıza giriş yapın.</p>
    <label>E-posta</label><input type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="E-posta adresiniz"/>
    <label>Şifre</label><input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Şifreniz"/>
    {error && <div className="error"><AlertCircle size={17}/>{error}</div>}
    <button className="gold-button full" disabled={busy}>{busy ? "Giriş yapılıyor..." : "Giriş Yap"}</button>
    <small className="muted center"><LockKeyhole size={13}/> Güvenli oturum • Supabase Auth</small>
  </form></div>;
}

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [checking, setChecking] = useState(true);
  const [page, setPage] = useState("dashboard");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [appointments, setAppointments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [packages, setPackages] = useState([]);
  const [customerPackages, setCustomerPackages] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({name:"", phone:"", service_id:"", date:new Date().toLocaleDateString("en-CA"), time:"", staff_id:"", price:"", notes:""});
  const isAdmin = profile?.role === "admin";

  useEffect(() => {
    let alive = true;
    supabase?.auth.getSession().then(({data}) => {
      if (alive) { setSession(data.session); setChecking(false); }
    }).catch(() => alive && setChecking(false));
    if (!supabase) setChecking(false);
    const { data: listener } = supabase?.auth.onAuthStateChange((_event, next) => {
      setSession(next); if (!next) { setProfile(null); setPage("dashboard"); }
    }) || {data:{subscription:null}};
    return () => { alive = false; listener?.subscription?.unsubscribe(); };
  }, []);

  useEffect(() => { if (session?.user?.id) loadProfile(); }, [session?.user?.id]);

  async function loadProfile() {
    setLoading(true); setError("");
    const {data, error: e} = await supabase.from("profiles").select("id,full_name,role,is_active,username").eq("id", session.user.id).single();
    if (e || !data || !data.is_active) {
      setError("Bu kullanıcı için aktif personel profili bulunamadı. Yönetici hesabının profiles kaydını kontrol edin.");
      await supabase.auth.signOut(); setLoading(false); return;
    }
    setProfile(data); await loadAll(data.role === "admin"); setLoading(false);
  }

  async function loadAll(admin = isAdmin) {
    setLoading(true); setError("");
    const jobs = await Promise.all([
      supabase.from("appointments").select("id,customer_id,staff_id,service_id,starts_at,ends_at,price,status,notes,customers(full_name,phone),profiles!appointments_staff_id_fkey(full_name),services(name,category)").order("starts_at",{ascending:true}),
      supabase.from("customers").select("id,full_name,phone,notes,created_at").order("created_at",{ascending:false}),
      supabase.from("services").select("id,name,category,price,duration_minutes,is_active").eq("is_active",true).order("name"),
      supabase.from("profiles").select("id,full_name,role,is_active,username").eq("is_active",true).order("full_name"),
      supabase.from("packages").select("id,name,total_sessions,price,is_active").eq("is_active",true).order("name"),
      supabase.from("customer_packages").select("id,customer_id,package_id,total_sessions,used_sessions,amount_total,amount_paid")
    ]);
    const labels = ["Randevular","Müşteriler","Hizmetler","Personel","Paketler","Müşteri paketleri"];
    const firstError = jobs.findIndex(x=>x.error);
    if (firstError >= 0) setError(`${labels[firstError]} yüklenemedi: ${jobs[firstError].error.message}`);
    setAppointments(jobs[0].data || []); setCustomers(jobs[1].data || []);
    setServices(jobs[2].data || []); setStaff(jobs[3].data || []);
    setPackages(jobs[4].data || []); setCustomerPackages(jobs[5].data || []);
    if (admin) {
      const fin = await supabase.from("transactions").select("id,type,amount,payment_method,description,occurred_at,customer_id").order("occurred_at",{ascending:false}).limit(200);
      setTransactions(fin.data || []);
      if (fin.error) setError(`Kasa kayıtları yüklenemedi: ${fin.error.message}`);
    } else setTransactions([]);
    setLoading(false);
  }

  async function logout() { await supabase.auth.signOut(); setSession(null); setProfile(null); }
  function flash(msg) { setNotice(msg); window.setTimeout(()=>setNotice(""),3000); }
  const menu = [
    ["dashboard","Genel Bakış",LayoutDashboard],["appointments","Randevular",CalendarDays],
    ["customers","Müşteriler",Users],["packages","Paket Takibi",Package],["services","Hizmetler",Scissors],
    ...(isAdmin ? [["finance","Kasa ve Finans",Wallet]] : [])
  ];
  const titles = {dashboard:"Genel Bakış",appointments:"Randevular",customers:"Müşteriler",packages:"Paket Takibi",services:"Hizmetler",finance:"Kasa ve Finans"};
  const today = new Date().toLocaleDateString("en-CA");
  const todays = appointments.filter(a => a.starts_at?.slice(0,10) === today);
  const totalIncome = transactions.filter(t=>t.type==="income").reduce((s,t)=>s+Number(t.amount||0),0);
  const activePackages = customerPackages.filter(p=>Number(p.used_sessions)<Number(p.total_sessions)).length;

  async function addAppointment(e) {
    e.preventDefault(); setError("");
    if (!form.name.trim() || !form.date || !form.time || !form.service_id || !form.staff_id) {
      setError("Müşteri, hizmet, personel, tarih ve saat alanlarını doldurun."); return;
    }
    setLoading(true);
    let customer = customers.find(c=>form.phone && c.phone===form.phone.trim());
    if (!customer) {
      const {data, error:e1} = await supabase.from("customers").insert({full_name:form.name.trim(),phone:form.phone.trim()||null,created_by:session.user.id}).select().single();
      if (e1) {setError(`Müşteri kaydedilemedi: ${e1.message}`);setLoading(false);return;}
      customer=data;
    }
    const service=services.find(s=>s.id===form.service_id);
    const start=new Date(`${form.date}T${form.time}:00`);
    const end=new Date(start.getTime()+(Number(service?.duration_minutes)||30)*60000);
    const {error:e2}=await supabase.from("appointments").insert({
      customer_id:customer.id, staff_id:form.staff_id, service_id:form.service_id,
      starts_at:start.toISOString(), ends_at:end.toISOString(),
      price:form.price===""?Number(service?.price||0):Number(form.price),
      status:"scheduled", notes:form.notes.trim()||null, created_by:session.user.id
    });
    if (e2) setError(`Randevu kaydedilemedi: ${e2.message}`);
    else {setShowForm(false);setForm({name:"",phone:"",service_id:"",date:today,time:"",staff_id:"",price:"",notes:""});flash("Randevu kaydedildi.");}
    await loadAll(); setLoading(false);
  }

  async function addCustomer(e) {
    e.preventDefault(); const fd=new FormData(e.currentTarget);
    const {error:e1}=await supabase.from("customers").insert({full_name:String(fd.get("full_name")).trim(),phone:String(fd.get("phone")).trim()||null,notes:String(fd.get("notes")).trim()||null,created_by:session.user.id});
    if(e1) setError(`Müşteri eklenemedi: ${e1.message}`); else {flash("Müşteri eklendi.");e.currentTarget.reset();await loadAll();}
  }

  if (checking || (session && !profile && !error)) return <div className="loading-screen"><div className="logo-mark">SY</div><p>Salon paneli açılıyor...</p></div>;
  if (!session) return <Login onLogin={setSession}/>;
  if (!profile) return <div className="loading-screen"><div className="error">{error || "Profil bilgisi bekleniyor."}</div><button className="outline-button" onClick={logout}>Çıkış yap</button></div>;

  return <div className="app-shell">
    <aside className={`sidebar ${mobileMenu?"open":""}`}>
      <div className="brand"><div className="logo-mark small">SY</div><div><strong>SEREN YILDIZ</strong><small>SALON YÖNETİMİ</small></div><button className="close-menu" onClick={()=>setMobileMenu(false)}><X/></button></div>
      <div className="menu-label">MENÜ</div>
      {menu.map(([id,label,Icon])=><button key={id} className={`nav-item ${page===id?"active":""}`} onClick={()=>{setPage(id);setMobileMenu(false);}}><Icon size={19}/>{label}{page===id&&<ChevronRight size={16}/>}</button>)}
      <div className="sidebar-bottom"><div className="profile"><div className="avatar">{(profile.full_name||"SY").slice(0,2).toUpperCase()}</div><div><strong>{profile.full_name}</strong><small>{isAdmin?"Yönetici":"Personel"}</small></div></div><button className="logout-button" onClick={logout}><LogOut size={16}/> Çıkış Yap</button></div>
    </aside>
    {mobileMenu&&<div className="overlay" onClick={()=>setMobileMenu(false)}/>}
    <main className="main">
      <header className="topbar"><button className="menu-button" onClick={()=>setMobileMenu(true)}><Menu/></button><div className="breadcrumb">Seren Yıldız <span>/</span> {titles[page]}</div><div className="top-actions"><span className="role-chip">{isAdmin?"Yönetici":"Personel"}</span><button className="icon-button" onClick={()=>loadAll()} title="Yenile"><RefreshCw size={18}/></button></div></header>
      <div className="content">
        <div className="page-heading"><div><div className="eyebrow">SALON YÖNETİM PANELİ</div><h1>{titles[page]}</h1><p>Salonunun günlük işlemlerini buradan yönetebilirsin.</p></div>{["dashboard","appointments"].includes(page)&&<button className="gold-button" onClick={()=>setShowForm(true)}><Plus size={18}/> Yeni Randevu</button>}</div>
        {error&&<div className="error notice"><AlertCircle size={17}/>{error}<button onClick={()=>setError("")}><X size={16}/></button></div>}
        {notice&&<div className="success"><CheckCircle2 size={17}/>{notice}</div>}
        {loading&&<div className="loading-line">Veriler güncelleniyor...</div>}
        {page==="dashboard"&&<><div className="stats">
          <Stat icon={CalendarDays} label="Bugünkü Randevular" value={todays.length} note="Bugün"/>
          <Stat icon={Users} label="Toplam Müşteri" value={customers.length} note="Kayıtlı müşteri"/>
          <Stat icon={Package} label="Aktif Paket" value={activePackages} note="Seans takibi"/>
          {isAdmin&&<Stat icon={Wallet} label="Toplam Gelir" value={`${totalIncome.toLocaleString("tr-TR")} ₺`} note="Kasa kayıtları"/>}
        </div><Panel title="Günün Randevuları" subtitle="Bugün için oluşturulan randevular"><AppointmentList items={todays}/></Panel></>}
        {page==="appointments"&&<Panel title="Randevu Listesi" subtitle="Tüm personelin ortak randevu kayıtları"><div className="toolbar"><input type="date" value={search} onChange={e=>setSearch(e.target.value)}/><button className="outline-button" onClick={()=>setSearch("")}>Tüm tarihler</button></div><AppointmentList items={appointments.filter(a=>!search||a.starts_at?.slice(0,10)===search)}/></Panel>}
        {page==="customers"&&<><Panel title="Yeni Müşteri" subtitle="Müşteri kartı oluştur"><form className="inline-form" onSubmit={addCustomer}><input name="full_name" required placeholder="Ad soyad"/><input name="phone" placeholder="Telefon"/><input name="notes" placeholder="Not (isteğe bağlı)"/><button className="gold-button">Kaydet</button></form></Panel><Panel title="Müşteri Listesi" subtitle={`${customers.length} kayıt`}><div className="search-box"><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Müşteri ara..."/></div><div className="list">{customers.filter(c=>c.full_name.toLocaleLowerCase("tr").includes(search.toLocaleLowerCase("tr"))||String(c.phone||"").includes(search)).map(c=><div className="customer-row" key={c.id}><div className="avatar">{c.full_name.slice(0,1).toUpperCase()}</div><div><strong>{c.full_name}</strong><small>{c.phone||"Telefon eklenmemiş"}</small></div></div>)}</div></Panel></>}
        {page==="packages"&&<Panel title="Paket ve Seans Takibi" subtitle="Tanımlı paketler ve müşterilerin seans durumları"><div className="package-grid">{packages.map(p=><div className="package-card" key={p.id}><strong>{p.name}</strong><b>{p.total_sessions} seans</b><span>{Number(p.price||0).toLocaleString("tr-TR")} ₺</span></div>)}</div><div className="list">{customerPackages.map(p=><div className="appointment-row" key={p.id}><div className="appointment-info"><strong>{customers.find(c=>c.id===p.customer_id)?.full_name||"Müşteri"}</strong><small>{packages.find(x=>x.id===p.package_id)?.name||"Paket"}</small></div><span className="date-label">{p.used_sessions}/{p.total_sessions} seans</span></div>)}</div>{!packages.length&&<Empty icon={Package} title="Aktif paket bulunamadı" text="Paketler tablosunda aktif paket olduğunda burada görünecek."/ >}</Panel>}
        {page==="services"&&<Panel title="Salon Hizmetleri" subtitle="Veritabanındaki aktif hizmetler"><div className="service-grid">{services.map(s=><div className="service-item" key={s.id}><Scissors size={18}/><div><strong>{s.name}</strong><small>{s.category||"Kategori belirtilmemiş"} • {s.duration_minutes||0} dk</small></div><b>{Number(s.price||0).toLocaleString("tr-TR")} ₺</b></div>)}</div>{!services.length&&<Empty icon={Scissors} title="Hizmet bulunamadı" text="services tablosuna aktif hizmet ekleyin."/ >}</Panel>}
        {page==="finance"&&isAdmin&&<Panel title="Kasa ve Finans" subtitle="Yalnızca yönetici erişebilir"><div className="finance-total"><span>Gelir toplamı</span><strong>{totalIncome.toLocaleString("tr-TR")} ₺</strong></div><div className="list">{transactions.map(t=><div className="appointment-row" key={t.id}><div className="appointment-info"><strong>{t.description|| (t.type==="income"?"Gelir":"Gider")}</strong><small>{new Date(t.occurred_at).toLocaleString("tr-TR")} • {t.payment_method||"Ödeme türü yok"}</small></div><b className={t.type==="income"?"income":"expense"}>{t.type==="income"?"+":"−"}{Number(t.amount).toLocaleString("tr-TR")} ₺</b></div>)}</div>{!transactions.length&&<Empty icon={Wallet} title="Henüz kasa kaydı yok" text="transactions tablosuna kayıt eklendiğinde burada listelenecek."/ >}</Panel>}
      </div>
    </main>
    {showForm&&<div className="modal-backdrop" onClick={()=>setShowForm(false)}><form className="modal" onSubmit={addAppointment} onClick={e=>e.stopPropagation()}>
      <div className="modal-heading"><div><h2>Yeni Randevu</h2><p>Müşteri ve randevu bilgilerini gir.</p></div><button type="button" className="icon-button" onClick={()=>setShowForm(false)}><X/></button></div>
      <label>Müşteri adı *</label><input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Ad soyad"/>
      <label>Telefon</label><input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="05xx xxx xx xx"/>
      <label>Hizmet *</label><select required value={form.service_id} onChange={e=>{const s=services.find(x=>x.id===e.target.value);setForm({...form,service_id:e.target.value,price:s?.price??""});}}><option value="">Hizmet seçin</option>{services.map(s=><option key={s.id} value={s.id}>{s.name} — {Number(s.price||0).toLocaleString("tr-TR")} ₺</option>)}</select>
      <label>Personel *</label><select required value={form.staff_id} onChange={e=>setForm({...form,staff_id:e.target.value})}><option value="">Personel seçin</option>{staff.map(s=><option key={s.id} value={s.id}>{s.full_name}</option>)}</select>
      <div className="form-grid"><div><label>Tarih *</label><input required type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></div><div><label>Saat *</label><input required type="time" value={form.time} onChange={e=>setForm({...form,time:e.target.value})}/></div></div>
      <label>Ücret (₺)</label><input type="number" min="0" step="0.01" value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/>
      <label>Not</label><textarea rows="2" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="İsteğe bağlı not"/>
      <button className="gold-button full" disabled={loading}><CheckCircle2 size={18}/> Randevuyu Kaydet</button>
    </form></div>}
  </div>;
}

function Stat({icon:Icon,label,value,note}) { return <div className="stat-card"><div className="stat-icon"><Icon/></div><span>{label}</span><strong>{value}</strong><small>{note}</small></div>; }
function Panel({title,subtitle,children}) { return <section className="panel"><div className="panel-heading"><div><h2>{title}</h2><p>{subtitle}</p></div></div>{children}</section>; }
function Empty({icon:Icon,title,text}) { return <div className="empty"><Icon size={34}/><strong>{title}</strong><span>{text}</span></div>; }
function AppointmentList({items}) {
  if (!items.length) return <Empty icon={CalendarDays} title="Henüz randevu yok" text="Yeni Randevu butonunu kullanarak kayıt oluşturabilirsiniz."/>;
  return <div className="list">{items.map(a=><div className="appointment-row" key={a.id}><div className="time"><Clock size={16}/>{new Date(a.starts_at).toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"})}</div><div className="appointment-info"><strong>{a.customers?.full_name||"Müşteri"}</strong><small>{a.services?.name||"Hizmet"} • {a.profiles?.full_name||"Personel"}</small></div><span className="date-label">{new Date(a.starts_at).toLocaleDateString("tr-TR")}</span></div>)}</div>;
}
createRoot(document.getElementById("root")).render(<App/>);
